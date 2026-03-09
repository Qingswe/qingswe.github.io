---
title: 监听 ASC 上 Tag 的变动
description: 记录如何监听 ASC 上 GameplayTag 的增减并响应状态变化。
tags: [unreal, gas, post, tag, delegate]
updated: 2025-04-27
---

# 监听 ASC 上 Tag 的变动

很多角色状态并不需要自己手动维护一个 `bool`，而是直接监听 ASC 上的 `GameplayTag` 计数变化。例如眩晕、沉默、燃烧、瞄准中、可交互等状态，都很适合由 Tag 驱动。

## 为什么要监听 Tag

因为在 GAS 里，很多状态天然就是通过 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 或能力激活时的标签变化来表达的：

- 某个 GE 添加了 `Debuff.Stun`
- 某个能力激活期间临时加上 `State.Casting`
- 某个 Buff 移除时标签计数归零

如果逻辑层、动画层、UI 层都各自再维护一份状态，就很容易不同步。直接监听 ASC 的 Tag 变化会更稳。

## 核心 API

最常用的是：

```cpp
AbilitySystemComponent
    ->RegisterGameplayTagEvent(StunTag, EGameplayTagEventType::NewOrRemoved)
    .AddUObject(this, &ThisClass::OnStunTagChanged);
```

对应回调通常长这样：

```cpp
void UMyWidgetController::OnStunTagChanged(const FGameplayTag CallbackTag, int32 NewCount)
{
    const bool bIsStunned = NewCount > 0;
    // 更新 UI / 输入状态 / 动画表现
}
```

## EGameplayTagEventType 怎么选

- `NewOrRemoved`：只关心“有没有这个状态”，最常用
- `AnyCountChange`：关心层数变化，例如毒层数、连击层数

【技巧】如果你的业务只是“开 / 关状态”，优先用 `NewOrRemoved`，回调噪音更少。

## 委托应该在哪里绑定

【重点】要在 ASC 已经准备好之后绑定，而不是在对象刚构造时就绑定。

常见绑定位置：

- `BeginPlay` 之后且 ASC 已初始化完成时
- 角色 `InitAbilityActorInfo` 之后
- UI / WidgetController 拿到 ASC 引用之后
- 多人游戏里客户端常放在 `OnRep_PlayerState` 后的初始化流程

如果绑定太早，ASC 还没准备好，或者 Tag 还没复制过来，就容易漏掉第一次状态。

## 什么时候取消绑定

如果是长期对象，可以在销毁或解绑依赖时移除委托：

```cpp
AbilitySystemComponent
    ->RegisterGameplayTagEvent(StunTag, EGameplayTagEventType::NewOrRemoved)
    .RemoveAll(this);
```

常见时机：

- `EndPlay`
- `NativeDestruct`
- WidgetController 的销毁流程
- Pawn / Controller 解绑 ASC 时

【注意】不要假设对象销毁后委托一定没问题。明确解绑会更安全，尤其是 UI 和切换 Pawn 的场景。

## 一个常见用法：监听控制状态

例如监听 `Debuff.Stun`：

- `NewCount > 0`：禁用输入、播放受控 UI、切状态动画
- `NewCount == 0`：恢复输入、关闭状态图标

这种写法比手动在多个能力里“遇到眩晕时设置 bool”更统一，因为状态来源始终是 ASC 上真实存在的 Tag。

## 实战建议

- 绑定后最好主动做一次当前状态同步，避免 UI 只对“未来变化”有反应。
- 如果多个系统都关心同一个 Tag，尽量让它们各自监听，不要让一个中央 `bool` 再转发。
- 对“持续状态”用 Tag 监听，对“瞬时事件”仍优先用事件或 GameplayCue。

## 常见坑

- 【注意】监听到的是 Tag 计数变化，不一定意味着“某一个具体 GE”增删；多个效果可能叠加同一个 Tag。
- 【注意】客户端 UI 想响应状态时，要确认对应 Tag 已经正确复制到本地 ASC。
- 【技巧】当某状态同时影响 UI、输入和动画时，用同一个 Tag 做统一入口，维护成本最低。

## 关联笔记

- [[w/unreal/gas/asc|ASC]]
- [[w/unreal/gas/gameplayeffect|GameplayEffect]]