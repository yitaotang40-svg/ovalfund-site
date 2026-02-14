# Oval Fund Site (Starter)

这是一个 **静态网站模板**，风格参考/借鉴 *Hayden Capital* 那种「极简 + 大留白 + 以 Investor Letters 为核心」的基金/投资机构官网结构。

> 你可以把它当作可直接部署到 GitHub Pages 的“骨架”，然后把文字、业绩数据、PDF 信件替换成你的真实内容。

---

## 目录结构

```
ovalfund-site/
  index.html
  performance.html
  assets/
    css/styles.css
    js/site.js
    img/letter-placeholder.svg
  data/performance.json
  content/letters.json
  letters/   <-- 把你的 PDF 放这里
```

---

## 1) 部署到 GitHub Pages（最简单）

1. 在 GitHub 新建一个仓库（比如：`ovalfund-site`）
2. 把本项目文件上传到仓库根目录（`index.html` 必须在根目录）
3. 进入 **Settings → Pages**
4. Source 选择 **Deploy from a branch**
5. Branch 选择 **main / root**，保存
6. 等待生成，你的网站会在：
   - `https://你的用户名.github.io/ovalfund-site/`

如果你希望是 `https://你的用户名.github.io/`（根域名），仓库名需要是 `你的用户名.github.io`

---

## 2) 更新业绩曲线

打开 `data/performance.json`，格式如下：

```json
{
  "base": 100,
  "series": [
    { "date": "2026-01-01", "fund": 101.23, "sp500": 100.56, "brk": 99.88 }
  ]
}
```

注意：
- `fund/sp500/brk` 都是 **Base=100 的净值**（不是百分比）。
- 网站会自动换算成 %（累计收益率）来画图。

---

## 3) 更新投资人信（Letters）

把 PDF 放进 `letters/`，然后编辑 `content/letters.json` 增加一条记录：

```json
{
  "year": 2026,
  "quarter": "Q1",
  "title": "2026 | Q1 Letter to Partners",
  "date": "2026-02-15",
  "pdfUrl": "letters/2026-q1-letter.pdf",
  "coverUrl": "assets/img/letter-placeholder.svg",
  "summary": "Portfolio update..."
}
```

---

## 4) 联系表单

模板里用了 Formspree 的写法：

```html
<form action="https://formspree.io/f/yourFormId" method="POST">
```

你需要：
1. 注册 Formspree
2. 新建一个 form，拿到 endpoint
3. 把 `yourFormId` 换成你的真实 ID

也可以改成 Netlify Forms / Google Forms 等。

---

## 5) 自定义域名（可选）

如果你有自己的域名，例如 `ovalfund.com`：
1. 在仓库根目录新增文件 `CNAME`
2. 内容写你的域名：`ovalfund.com`
3. 在域名 DNS 配置指向 GitHub Pages

---

## 免责声明

本模板仅用于网站搭建示例；你用于对外展示时，请根据所在司法辖区咨询专业合规/律师，尤其是涉及“基金/募资/业绩宣传”的表述与范围。
