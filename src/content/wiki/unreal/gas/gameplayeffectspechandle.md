---
title: GameplayEffectSpecHandle
description: GameplayEffectSpecHandle 用于安全传递和共享 GE Spec 句柄。
tags: [Unreal, GAS]
updated: 2025-04-22
---

# GameplayEffectSpecHandle

【重点】`GameplayEffectSpecHandle` 不是 [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]] 本体，而是一个“**可安全传递的包装句柄**”。它的作用是把运行时的 `Spec` 用轻量形式在 C++、蓝图、能力任务、投射物等对象之间传来传去。

## 为什么不直接到处传 Spec

`GameplayEffectSpec` 本身携带的运行时信息比较多，直接裸传既不方便，也不适合在很多蓝图 / 接口场景里来回复制。`Handle` 的意义就是：

- 统一“有效 / 无效”的判断方式
- 让复制和传参更便宜
- 允许多个流程共享同一份 `Spec`

官方实现里它本质上包装了一份指向 `FGameplayEffectSpec` 的共享引用，所以复制 `Handle` 的成本远小于深拷贝整份 `Spec`。

## 常见创建路径

最常见的入口有两个：

- `ASC->MakeOutgoingSpec(...)`
- [[w/unreal/gas/gameplayability|GameplayAbility]] 里的 `MakeOutgoingGameplayEffectSpec(...)`

它们返回的都是 `FGameplayEffectSpecHandle`，后续你就可以：

- 写 `SetByCaller`
- 填充 [[w/unreal/gas/effectcontext|EffectContext]]
- 暂存到投射物或技能任务里
- 最后再调用 `ApplyGameplayEffectSpecToSelf / Target`

## 所有权和生命周期

【重点】Handle 通常是“多处共享同一份 Spec”的语义。

- 只要还有有效 `Handle` 持有它，这份 `Spec` 就还活着
- `Handle` 失效时，不代表 GE 失效，只是你不再能安全访问那份待应用的 `Spec`

【注意】复制 `Handle` 通常不会自动生成新 `Spec`，多个 `Handle` 很可能指向同一份运行时数据。

## 在项目里的典型用途

### 1. 先创建，稍后应用

【例子】发射投射物时先构造伤害 `SpecHandle`，把它存进 Projectile，命中敌人时再应用。

### 2. 蓝图和 C++ 间传递

一些 AbilityTask 或蓝图节点更适合传 `Handle`，而不是直接暴露整份 `Spec`。

### 3. 多阶段处理

一个技能可能先写入 `SetByCaller`，再补上下文，最后才真正应用。这时 `Handle` 很适合作为中间载体。

## 使用时要注意什么

- 调用前先检查 `IsValid()`
- 解引用前先确认 `Data` 还存在
- 如果后续不同目标需要不同数值，不要盲目复用同一个 `Handle`

【注意】“复制了一个 Handle”不等于“复制了一份完全独立的 Spec”。如果你要给两个目标不同的伤害值，通常应该分别创建各自的 `Spec`。

## 和 Spec 的关系

可以用一句话记：

- [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]：真正的数据
- `GameplayEffectSpecHandle`：拿着这份数据到处传的引用包装

## 关联笔记

- [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]]
- [[w/unreal/gas/applygameplayeffecttoself|ApplyGamePlayEffectToSelf]]
- [[w/unreal/gas/sourceobject|SourceObject]]