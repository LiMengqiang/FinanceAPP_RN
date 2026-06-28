import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = {
  bg: '#F3F6FA',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  brand: '#0F766E',
  up: '#D93025',
  down: '#188038',
  flat: '#6B7280',
};

const defaultFutures = [
  contract('nf_SC0', '上海原油连续', '上期能源', 'future'),
  contract('nf_AU0', '沪金连续', '上期所', 'future'),
  contract('nf_RB0', '螺纹钢连续', '上期所', 'future'),
  contract('nf_CU0', '沪铜连续', '上期所', 'future'),
  contract('nf_M0', '豆粕连续', '大商所', 'future'),
  contract('nf_Y0', '豆油连续', '大商所', 'future'),
  contract('nf_IF0', '沪深300股指连续', '中金所', 'future'),
  contract('nf_IH0', '上证50股指连续', '中金所', 'future'),
  contract('nf_IC0', '中证500股指连续', '中金所', 'future'),
];

const defaultOptionSources = [
  contract('SHFE_OPTIONS', '上期所期权日行情', '上期所', 'option'),
  contract('DCE_OPTIONS', '大商所期权日行情', '大商所', 'option'),
  contract('CZCE_OPTIONS', '郑商所期权日行情', '郑商所', 'option'),
  contract('CFFEX_OPTIONS', '中金所期权日行情', '中金所', 'option'),
];

const exchangeLinks = [
  ['上期所日行情', '合约资料、结算价、成交量', 'https://www.shfe.com.cn/reports/tradedata/dailyandweeklydata/'],
  ['上期能源日行情', '原油等能源期货期权', 'https://www.ine.cn/reports/tradedata/dailyandweeklydata/'],
  ['大商所日行情', '农产品、化工等期货期权', 'http://www.dce.com.cn/dalianshangpin/xqsj/tjsj26/rtj/rxq/index.html'],
  ['郑商所日行情', '农产品、能源化工等期货期权', 'http://www.czce.com.cn/cn/DFSStaticFiles/Future/'],
  ['中金所日行情', '股指、国债及相关期权', 'https://www.cffex.com.cn/ccpm/'],
];

const WATCHLIST_KEY = 'FOWatchlistSymbolsKey';

function contract(symbol, name, exchange, kind) {
  return {
    symbol,
    name,
    exchange,
    kind,
    lastPrice: '--',
    changeText: '--',
    changePercentText: '--',
    volumeText: '--',
    settlementText: '--',
    tradingDay: '--',
    quoteTime: '--',
  };
}

export default function App() {
  const [tab, setTab] = useState('market');
  const [watchlist, setWatchlist] = useState([]);

  const loadWatchlist = useCallback(async () => {
    const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
    setWatchlist(raw ? JSON.parse(raw) : []);
  }, []);

  const toggleWatchlist = useCallback(async symbol => {
    setWatchlist(current => {
      const next = current.includes(symbol) ? current.filter(item => item !== symbol) : [...current, symbol];
      AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeWatchlist = useCallback(async symbol => {
    setWatchlist(current => {
      const next = current.filter(item => item !== symbol);
      AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {tab === 'market' && <MarketPage watchlist={watchlist} onToggleWatchlist={toggleWatchlist} />}
        {tab === 'watchlist' && <WatchlistPage watchlist={watchlist} onRemoveWatchlist={removeWatchlist} />}
        {tab === 'profile' && <ProfilePage />}
      </View>
      <View style={styles.tabBar}>
        <TabButton active={tab === 'market'} icon={require('./src/assets/tab_market.png')} label="行情" onPress={() => setTab('market')} />
        <TabButton active={tab === 'watchlist'} icon={require('./src/assets/tab_watchlist.png')} label="自选" onPress={() => setTab('watchlist')} />
        <TabButton active={tab === 'profile'} icon={require('./src/assets/tab_profile.png')} label="我的" onPress={() => setTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

function MarketPage({watchlist, onToggleWatchlist}) {
  const [segment, setSegment] = useState('future');
  const [futures, setFutures] = useState(defaultFutures);
  const [statusText, setStatusText] = useState('新浪实时行情 · 交易所公开数据');

  const refreshQuotes = useCallback(async () => {
    if (segment !== 'future') return;
    try {
      const quotes = await fetchQuotes(futures);
      setFutures(quotes);
      setStatusText(`新浪实时行情 · 已更新 ${timeText()}`);
    } catch (error) {
      Alert.alert('行情刷新失败，请稍后重试');
    }
  }, [futures, segment]);

  useEffect(() => {
    refreshQuotes();
  }, []);

  const data = segment === 'future' ? futures : defaultOptionSources;

  return (
    <View style={styles.page}>
      <Header title="行情" right="刷新" onRightPress={refreshQuotes} />
      <View style={styles.segment}>
        <SegmentButton active={segment === 'future'} label="期货" onPress={() => setSegment('future')} />
        <SegmentButton active={segment === 'option'} label="期权" onPress={() => setSegment('option')} />
      </View>
      <FlatList
        data={[{type: 'header', symbol: 'header'}, ...data]}
        keyExtractor={item => item.symbol}
        renderItem={({item}) => {
          if (item.type === 'header') return <MarketHeader statusText={statusText} />;
          if (item.kind === 'option') return <OptionTile contract={item} />;
          return <QuoteRow contract={item} watchlisted={watchlist.includes(item.symbol)} compact onPress={() => onToggleWatchlist(item.symbol)} />;
        }}
      />
    </View>
  );
}

function WatchlistPage({watchlist, onRemoveWatchlist}) {
  const [contracts, setContracts] = useState([]);

  const reloadWatchlist = useCallback(async () => {
    const saved = watchlist.map(symbol => defaultFutures.find(item => item.symbol === symbol)).filter(Boolean);
    if (saved.length === 0) {
      setContracts([]);
      return;
    }
    try {
      setContracts(await fetchQuotes(saved));
    } catch (error) {
      setContracts(saved);
      Alert.alert('自选刷新失败，请稍后重试');
    }
  }, [watchlist]);

  useEffect(() => {
    reloadWatchlist();
  }, [reloadWatchlist]);

  return (
    <View style={styles.page}>
      <Header title="自选" right="刷新" onRightPress={reloadWatchlist} />
      {contracts.length === 0 ? (
        <View style={styles.empty}><Text style={styles.subText}>暂无自选，在行情页点选合约添加</Text></View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={item => item.symbol}
          renderItem={({item}) => <QuoteRow contract={item} watchlisted onPress={() => onRemoveWatchlist(item.symbol)} />}
        />
      )}
    </View>
  );
}

function ProfilePage() {
  return (
    <View style={styles.page}>
      <Header title="我的" />
      <ScrollView>
        <SectionTitle title="数据源" />
        <InfoTile title="新浪实时行情" subtitle="用于期货连续合约最新价、涨跌幅、成交量。" />
        <InfoTile title="交易所公开数据" subtitle="用于合约资料、结算价、历史日行情。" />
        <SectionTitle title="交易所公开数据" />
        {exchangeLinks.map(([title, subtitle, url]) => (
          <InfoTile key={title} title={title} subtitle={subtitle} arrow onPress={() => Linking.openURL(url)} />
        ))}
        <SectionTitle title="风险提示" />
        <InfoTile title="免费行情源稳定性和授权范围有限，正式上线前需要确认交易所或数据商授权。当前数据仅供学习和演示，不构成投资建议。" />
      </ScrollView>
    </View>
  );
}

async function fetchQuotes(contracts) {
  const futures = contracts.filter(item => item.kind === 'future');
  if (!futures.length) return [];
  const symbols = futures.map(item => item.symbol).join(',');
  const response = await fetch(`https://hq.sinajs.cn/list=${symbols}`, {
    headers: {
      Referer: 'https://finance.sina.com.cn/',
      'User-Agent': 'Mozilla/5.0 ReactNative FinanceApp',
    },
  });
  const payload = await response.text();
  const parsed = parsePayload(payload, futures);
  return parsed.length ? parsed : futures;
}

function parsePayload(payload, baseContracts) {
  const baseBySymbol = Object.fromEntries(baseContracts.map(item => [item.symbol, item]));
  const regex = /var hq_str_([^=]+)="([^"]*)";/g;
  const result = [];
  let match;
  while ((match = regex.exec(payload))) {
    const base = baseBySymbol[match[1]];
    if (base) result.push(fillContract(base, match[2].split(',')));
  }
  return result;
}

function fillContract(contractItem, fields) {
  const firstFieldIsName = Number.isNaN(Number(fields[0]));
  if (firstFieldIsName) {
    return withChange({
      ...contractItem,
      lastPrice: field(fields, 8, field(fields, 7, '--')),
      volumeText: field(fields, 13, '--'),
      tradingDay: field(fields, 17, '--'),
      settlementText: field(fields, 10, '--'),
      quoteTime: field(fields, 1, '--'),
    }, field(fields, 8, '0'), field(fields, 10, '0'));
  }
  return withChange({
    ...contractItem,
    lastPrice: field(fields, 3, '--'),
    volumeText: field(fields, 4, '--'),
    settlementText: field(fields, 7, '--'),
    tradingDay: field(fields, 37, '--'),
    quoteTime: field(fields, 38, '--'),
  }, field(fields, 3, '0'), field(fields, 7, '0'));
}

function withChange(contractItem, last, previous) {
  const lastValue = Number(last);
  const previousValue = Number(previous);
  if (!lastValue || !previousValue) return {...contractItem, changeText: '--', changePercentText: '--'};
  const change = lastValue - previousValue;
  const sign = change >= 0 ? '+' : '';
  return {
    ...contractItem,
    changeText: `${sign}${change.toFixed(2)}`,
    changePercentText: `${sign}${(change / previousValue * 100).toFixed(2)}%`,
  };
}

function field(fields, index, fallback) {
  const value = fields[index]?.trim();
  return value || fallback;
}

function QuoteRow({contract: item, watchlisted, compact, onPress}) {
  const change = Number(item.changeText) || 0;
  const trendColor = change > 0 ? colors.up : (change < 0 ? colors.down : colors.flat);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.quoteOuter, compact && styles.quoteOuterCompact]}>
      <View style={styles.quoteCard}>
        <View style={styles.quoteLeft}>
          <Text style={styles.quoteName} numberOfLines={1}>{watchlisted ? '★ ' : ''}{item.name}</Text>
          <Text style={styles.quoteMeta} numberOfLines={1}>{item.symbol} · {item.exchange} · 量{item.volumeText}</Text>
        </View>
        <View style={styles.quoteRight}>
          <Text style={[styles.price, {color: trendColor}]}>{item.lastPrice}</Text>
          <View style={[styles.changePill, {backgroundColor: trendColor}]}><Text style={styles.changeText}>{item.changePercentText}</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Header({title, right, onRightPress}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {right ? <TouchableOpacity style={styles.headerRight} onPress={onRightPress}><Text style={styles.headerAction}>{right}</Text></TouchableOpacity> : null}
    </View>
  );
}

function MarketHeader({statusText}) {
  return (
    <View style={styles.marketHeader}>
      <Text style={styles.marketTitle}>期货期权行情</Text>
      <Text style={styles.subText}>{statusText}</Text>
    </View>
  );
}

function SegmentButton({active, label, onPress}) {
  return <TouchableOpacity style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></TouchableOpacity>;
}

function OptionTile({contract: item}) {
  return <View style={styles.optionTile}><Text style={styles.infoTitle}>{item.name}</Text><Text style={styles.infoSubtitle}>{item.exchange} · 交易所公开日行情入口</Text></View>;
}

function InfoTile({title, subtitle, arrow, onPress}) {
  return <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.infoTile}><View style={{flex: 1}}><Text style={styles.infoTitle}>{title}</Text>{subtitle ? <Text style={styles.infoSubtitle}>{subtitle}</Text> : null}</View>{arrow ? <Text style={styles.arrow}>›</Text> : null}</TouchableOpacity>;
}

function SectionTitle({title}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TabButton({active, icon, label, onPress}) {
  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <Image source={icon} style={[styles.tabIcon, {tintColor: active ? colors.brand : colors.sub}]} />
      <Text style={[styles.tabLabel, active && {color: colors.brand}]}>{label}</Text>
    </TouchableOpacity>
  );
}

function timeText() {
  const now = new Date();
  const two = value => String(value).padStart(2, '0');
  return `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.card},
  container: {flex: 1, backgroundColor: colors.bg},
  page: {flex: 1, backgroundColor: colors.bg},
  header: {height: 48, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 16},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  headerRight: {position: 'absolute', right: 16},
  headerAction: {color: colors.brand, fontSize: 15},
  segment: {flexDirection: 'row', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#E5E7EB', borderRadius: 8, padding: 2},
  segmentButton: {flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6},
  segmentButtonActive: {backgroundColor: colors.card},
  segmentText: {fontSize: 14, color: colors.sub},
  segmentTextActive: {color: colors.text, fontWeight: '700'},
  marketHeader: {paddingHorizontal: 16, paddingVertical: 12},
  marketTitle: {fontSize: 21, fontWeight: '700', color: colors.text},
  subText: {fontSize: 12, color: colors.sub, marginTop: 4},
  quoteOuter: {height: 74, paddingHorizontal: 12, paddingVertical: 5},
  quoteOuterCompact: {height: 64, paddingVertical: 2.5},
  quoteCard: {flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center'},
  quoteLeft: {flex: 1, marginRight: 12},
  quoteName: {fontSize: 16, fontWeight: '700', color: colors.text},
  quoteMeta: {fontSize: 12, color: colors.sub, marginTop: 4},
  quoteRight: {width: 112, alignItems: 'flex-end'},
  price: {fontSize: 18, fontWeight: '700'},
  changePill: {width: 76, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 4},
  changeText: {fontSize: 12, color: colors.card, fontWeight: '700'},
  optionTile: {marginHorizontal: 12, marginVertical: 2.5, padding: 14, backgroundColor: colors.card, borderRadius: 8},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  sectionTitle: {paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, color: colors.sub, fontSize: 13, fontWeight: '600'},
  infoTile: {minHeight: 62, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center'},
  infoTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  infoSubtitle: {fontSize: 12, color: colors.sub, marginTop: 4},
  arrow: {fontSize: 28, color: colors.sub},
  tabBar: {height: 58, flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB'},
  tabButton: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  tabIcon: {width: 24, height: 24},
  tabLabel: {fontSize: 11, color: colors.sub, marginTop: 2},
});
