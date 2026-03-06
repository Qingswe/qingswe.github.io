---
title: Static Site Generator
description: 将模板和内容预先编译成静态 HTML 文件的工具
tags: [工具, 网站, 性能]
updated: 2024-01-01
---

## 什么是静态站点生成器？

静态站点生成器（SSG）是一种在构建时将模板和内容（通常是 [[w/markdown|Markdown]]）预编译成静态 HTML、CSS 和 JavaScript 文件的工具。

与动态网站不同，静态站点无需服务端运行时，所有页面在部署前就已生成完毕。

## 优势

- **极快的加载速度** — 直接提供预构建的 HTML 文件
- **安全性高** — 无数据库，无服务端代码
- **易于部署** — 可托管在任何静态文件服务上
- **版本控制友好** — 内容可存放于 Git 仓库

## 常见工具

| 工具 | 语言 | 特点 |
|------|------|------|
| Astro | JavaScript | 岛屿架构，零 JS 默认 |
| Hugo | Go | 构建速度极快 |
| Jekyll | Ruby | GitHub Pages 原生支持 |
| Next.js | JavaScript | SSG + SSR 混合 |

## 本博客

本博客使用 **Astro** 构建，结合 Fuwari 主题，将 [[w/markdown|Markdown]] 文章编译为静态页面。
