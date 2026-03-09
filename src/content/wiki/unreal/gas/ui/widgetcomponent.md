---
title: WidgetComponent
description: WidgetComponent 用于把 UMG 挂到 3D 场景对象上显示。
tags: [Unreal, UI]
updated: 2025-04-29
---

# WidgetComponent

【重点】`UWidgetComponent` 的职责是把一个 UMG Widget 变成“**场景中的组件**”。普通 Widget 一般加到 Viewport 里，而 `WidgetComponent` 会把它挂在 Actor 身上，跟着世界中的对象一起移动、显示和隐藏。

## 它解决什么问题

当 UI 需要和场景对象绑定时，普通 Widget 往往不够直接，例如：

- 头顶血条
- NPC 名字
- 交互提示
- 伤害飘字

这时 `WidgetComponent` 就很合适，因为它天然知道自己挂在哪个 Actor 上。

## 常见挂载方式

最典型的做法是：

1. 在角色或怪物类上添加 `WidgetComponent`
2. 指定 `WidgetClass`
3. 调整相对位置，让它出现在头顶或身体前方
4. 在 `BeginPlay` 时通过 `GetUserWidgetObject()` 取出实际 Widget，初始化血量、名字等数据

【例子】角色血条常见结构：

- `ACharacter`
- `UWidgetComponent`
- `UUserWidget` 或自定义血条 Widget

## World Space 和 Screen Space

`WidgetComponent` 常见有两种显示空间：

- `World`：真正存在于 3D 世界里，会受朝向、遮挡、距离影响
- `Screen`：逻辑上跟着 Actor，但渲染上更接近屏幕空间 UI

【技巧】头顶血条若希望始终清晰可读，很多项目会优先考虑 `Screen Space`；如果希望和世界交互、遮挡关系更真实，则选 `World Space`。

## 血条 / 飘字的常见模式

### 1. 头顶血条

- 常驻一个 `WidgetComponent`
- Widget 内部显示血量、护盾、名字
- 数据通常来自角色组件、ASC 或 WidgetController

### 2. 伤害飘字

常见有两种做法：

- 给受击目标临时生成一个带 `WidgetComponent` 的 Actor
- 或者由 HUD 统一在屏幕空间做飘字

如果你希望飘字和命中位置、遮挡、世界坐标强绑定，`WidgetComponent` 更直观。

## 和普通 Widget 的区别

- 普通 `UUserWidget`：一般加到 Viewport，偏向整体 HUD、菜单、背包
- `WidgetComponent`：偏向“某个世界对象自己的 UI”

【重点】前者是“屏幕上的界面”，后者是“场景物体上的界面”。

## 实用注意点

- 【注意】大量世界 Widget 会有渲染和 Tick 成本，血条太多时要做距离裁剪或可见性控制。
- 【注意】如果使用 `World Space`，通常还要处理朝向摄像机的问题。
- 【技巧】Widget 内部的布局仍然是 UMG 逻辑，像 [[w/unreal/gas/ui/widget中overlay|Widget中Overlay]] 这类根面板组织方式照样适用。
- 【技巧】运行时修改类或数据前，先确认组件已经成功创建并初始化了实际的 `UserWidget`。

## 关联笔记

- [[w/unreal/gas/ui/widget中overlay|Widget中Overlay]]