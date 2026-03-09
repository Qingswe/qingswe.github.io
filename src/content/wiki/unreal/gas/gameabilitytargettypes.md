---
title: GameAbilityTargetTypes
description: 项目中的 TargetTypes 封装了技能目标选择与命中数据结构。
tags: [Unreal, GAS]
updated: 2025-04-19
---

# GameAbilityTargetTypes

【重点】`GameAbilityTargetTypes` 不是 GAS 引擎内置的单一类型，而是项目里对“**技能如何找目标、如何把结果组装成 TargetData**”这一段逻辑的封装。它的价值在于把“选目标”从 [[w/unreal/gas/gameplayability|GameplayAbility]] 主流程里拆出来，让能力只关心施法流程，不关心每一种命中方式的细节。

## 为什么要做 TargetType 封装

如果所有技能都把“取自己 / 取事件里的命中结果 / 做一次 Trace / 取鼠标下对象”直接写在能力里，很快就会出现：

- 同一段目标选择代码到处复制
- 单体技能、AOE 技能、投射物技能的入口风格不一致
- `FGameplayEventData`、命中结果、[[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]] 的衔接越来越乱

所以项目里通常会把“目标来源”抽象成几类 TargetType。

## 常见的几类 TargetType

结合 GAS 项目的常见写法，可以把它们理解成以下几类：

- **自身型**：直接把自己作为目标。常用于自 Buff、位移准备、给自身加状态。
- **事件型**：从 `FGameplayEventData` 里读目标、命中信息或已有的 `TargetData`。常用于动画通知、受击事件、连招事件。
- **命中结果型**：根据 `HitResult`、Trace、鼠标点选等结果构造目标数据。常用于指向性技能或投射物命中。
- **范围型**：根据球形 / 盒形 / 圆锥范围收集多个目标，再打包进一个 `TargetDataHandle`。

【技巧】从设计上看，TargetType 更像“如何**生成** TargetData”的策略对象。

## 它和 FGameplayAbilityTargetData 的关系

【重点】TargetType 自己通常不直接参与效果结算，真正被后续系统消费的是 [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]。

TargetType 做的事情通常是：

1. 读能力上下文、事件、Trace 结果
2. 选出命中的 Actor / HitResult / 位置
3. 组装成 `FGameplayAbilityTargetDataHandle`
4. 交给能力、事件或 RPC 继续传递

后续才会出现：

- `ApplyGameplayEffectSpecToTarget`
- 发送 `GameplayEvent`
- `ServerSetReplicatedTargetData`

## 在能力中的典型调用位置

常见有三种入口：

- 在 `ActivateAbility` 里直接根据配置的 TargetType 创建目标数据
- 在 [[w/unreal/abilitytask_waittargetdata|AbilityTask_WaitTargetData]] 完成回调里拿到目标数据
- 在 `GameplayEvent` 到达时，从事件 payload 中取现成的 `TargetData`

## 一个实用的心智模型

可以把整个链路理解成：

`TargetType` 负责“找谁”  
`FGameplayAbilityTargetData` 负责“怎么表示这个结果”  
`GameplayAbility / ASC / GameplayEvent` 负责“把这个结果交给后续结算”

## 和 Aura / ARPG 风格项目的关系

很多示例项目都会把 `UseOwner`、`UseEventData`、`TraceUnderMouse` 这类选择方式独立出来。这样做的好处是：

- 同一技能可以替换不同的选目标策略
- 蓝图层更容易配置
- 网络传输时更容易统一成 [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]

## 常见坑

- 【注意】TargetType 只是目标选择层，不要把伤害公式、资源扣减这些执行逻辑也塞进去。
- 【注意】多人游戏里，本地拿到目标后还要考虑是否需要复制到服务器，不能把“本地选中”误当成“服务器已确认”。
- 【技巧】如果某个技能只需要命中结果，不一定要创建复杂的新 TargetType；先确认项目里是否已有可以复用的那一类。

## 关联笔记

- [[w/unreal/gas/fgameplayabilitytargetdata|FGameplayAbilityTargetData]]
- [[w/unreal/gas/gameplayability|GameplayAbility]]
- [[w/unreal/gas/虚幻事件声明|虚幻事件声明]]
- [[w/unreal/gas/predictionkey|PredictionKey]]