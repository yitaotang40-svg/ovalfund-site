# Oval Fund Website

Oval Fund 的公开网站，部署在 GitHub Pages：

https://yitaotang40-svg.github.io/ovalfund-site/

## 页面

- `index.html`：基金定位、投资方法、业绩概览、主要持仓、风险、条款、团队与联系信息
- `performance.html`：累计收益、回撤、区间切换与近期净值表
- `holding.html`：主要持仓标的的日线 K 线、成交量和时间区间切换
- `data/performance.csv`：网站唯一的业绩数据源
- `data/holdings.json`：主要持仓清单与标的信息
- `data/holdings/*.json`：从 Nasdaq 更新的近一年日线 OHLC 数据

## 更新业绩

在 `data/performance.csv` 末尾追加一行：

```csv
Date,Share Price,SP500,BRK,GLD
2026-07-18,130.83,7457.69,480.46,368.41
```

页面会自动计算并更新：

- 最新单位净值
- 成立以来收益
- 年内收益与近 3 个月收益
- 最大回撤
- S&P 500 与 GLD 基准对比
- 近期净值表

`BRK` 列为历史数据兼容保留，当前公开图表不展示该基准。

## 更新主要持仓

在 `data/holdings.json` 的 `holdings` 数组中增删标的。每个标的需提供 ticker、名称、
Nasdaq `assetClass`、展示分类、交易所和对应数据文件路径。

更新清单后运行：

```bash
node scripts/update-holdings-data.mjs
```

脚本会读取持仓配置，并从 Nasdaq 更新各标的近一年的日线开盘、最高、最低、收盘与成交量数据。
首页持仓卡片和 `holding.html?symbol=ADBE` 详情页会自动读取这些文件。

## 本地预览

在仓库目录启动任意静态文件服务器，例如：

```bash
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 内容边界

网站只保留当前真实可用内容。投资人信、PDF 材料和公开表单在有实际文件或服务前不加入页面。

本项目为静态 HTML、CSS 与 JavaScript，不需要构建步骤。
