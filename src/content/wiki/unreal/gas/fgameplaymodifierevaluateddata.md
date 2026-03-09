---
title: FGameplayModifierEvaluatedData
description: ModifierEvaluatedData 表示 GameplayEffect 修改器求值后的结果。
tags: [unreal, gas, wiki, modifier, data]
updated: 2025-04-30
---

# FGameplayModifierEvaluatedData

【重点】`FGameplayModifierEvaluatedData` 表示“**一次 Execution Calculation 已经算好的属性修改结果**”。你可以把它理解为：前面已经完成捕获、公式、判断，最后把结果包装成一个“要改哪个属性、怎么改、改多少”的结构体。

## 它包含什么

这类结果最关心的就是三件事：

- `Attribute`：最终要修改的目标属性。
- `ModifierOp`：用什么操作修改，例如 `Additive`、`Multiplicitive`、`Override`。
- `Magnitude`：这次求值出来的数值。

【例子】如果一次伤害执行最终算出 `IncomingDamage = 128`，那么输出常常就是：

- 目标属性：`IncomingDamage`
- 操作：`Additive`
- 数值：`128`

## 在执行链路里的位置

【重点】它通常出现在 [[w/unreal/gas/execution-calculation|Execution Calculation]] 的最后一段。

完整顺序一般是：

1. 通过 [[w/unreal/gas/fgameplayeffectattributecapturedefinition|FGameplayEffectAttributeCaptureDefinition]] 捕获 Source / Target 属性
2. 读取 [[w/unreal/gas/gameplayeffectspec|GameplayEffectSpec]] 上的上下文、标签、`SetByCaller`
3. 在 Execution 中完成护甲、抗性、暴击、格挡等逻辑
4. 生成一个或多个 `FGameplayModifierEvaluatedData`
5. 交给 `OutExecutionOutput.AddOutputModifier(...)`

```cpp
FGameplayModifierEvaluatedData EvaluatedData(
    DamageStatics().ArmorProperty,
    EGameplayModOp::Additive,
    Armor
);
OutExecutionOutput.AddOutputModifier(EvaluatedData);
```

## 它和 ExecutionOutput 的关系

- `FGameplayModifierEvaluatedData`：单条“修改结果”
- `FGameplayEffectCustomExecutionOutput`：这次执行的“结果容器”

也就是说：

- 一个 ExecutionOutput 里可以装多条 `FGameplayModifierEvaluatedData`
- 同一次执行可以同时改多个属性

【例子】一次复杂结算可以同时输出：

- `IncomingDamage`
- `IncomingXP`
- 某个临时标记属性

## 为什么它重要

【重点】Execution Calculation 不是直接去改角色字段，而是先产出标准化的 modifier 结果，再交回 GAS 执行后续属性修改流程。这样好处是：

- 仍然走 GAS 的属性修改管线
- 能统一触发 `AttributeSet` 的后续钩子
- 便于一个 Execution 生成多条结果

## 在 Aura 里的典型用法

结合 [[w/unreal/gas/metaattributes|MetaAttributes]] 看会更清楚：

- Aura 的伤害 Execution 往往不是直接改 `Health`
- 而是先输出到 `IncomingDamage`
- 然后在 `AttributeSet::PostGameplayEffectExecute` 中把 `IncomingDamage` 扣到真实生命值上

这样可以把“计算伤害”和“处理死亡 / 击退 / 飘字”拆开。

## 常见坑

- 【注意】它表示的是“已经求值后的结果”，不是编辑器里配置的原始 Modifier。
- 【注意】Execution Calculation 默认是服务端权威逻辑，因此这里产出的结果通常也应按服务器结算来理解。
- 【技巧】如果一个 Execution 逻辑很长，先把每段中间值整理好，最后集中构造 `FGameplayModifierEvaluatedData`，可读性会好很多。

## 关联笔记

- [[w/unreal/gas/execution-calculation|Execution Calculation]]
- [[w/unreal/gas/fgameplayeffectattributecapturedefinition|FGameplayEffectAttributeCaptureDefinition]]
- [[w/unreal/gas/metaattributes|MetaAttributes]]