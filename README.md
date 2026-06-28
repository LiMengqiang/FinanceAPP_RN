# FinanceAPP_RN

React Native 实现的期货期权行情 App 学习 Demo，用于验证跨端技术在金融行情页面、自选状态管理和基础本地存储场景下的实现方式。

## 功能

- 行情页：展示期货连续合约行情，支持手动刷新。
- 自选页：支持添加、移除自选合约，并通过 AsyncStorage 保存。
- 我的页：展示新浪实时行情、交易所公开数据入口和风险提示。
- 跨端页面：同一套 JS 页面逻辑运行在 iOS 和 Android 工程中。

## 技术栈

- React Native 0.74
- React 18
- JavaScript
- AsyncStorage
- Fetch API

## 运行方式

```bash
npm install
npm run ios
# 或
npm run android
```

如运行 iOS，需要先进入 `ios` 目录执行 `pod install`。

## 学习重点

- React Native 基础页面开发和组件拆分。
- 行情列表、自选状态和本地存储。
- Fetch 网络请求与金融行情数据解析。
- 与原生 iOS、Flutter、Harmony 实现进行对比。

## 说明

本项目仅用于移动端技术学习和 Demo 展示，行情数据来自公开网络数据源，不保证实时性、完整性和可用性，不构成任何投资建议。
