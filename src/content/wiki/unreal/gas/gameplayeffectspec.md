---
title: GameplayEffectSpec
description: GameplayEffectSpec 是 GE 在运行时携带等级、上下文和动态参数的实例。
tags: [unreal, gas, wiki, gameplay-effect-spec, runtime]
updated: 2025-04-30
---

# GameplayEffectSpec

【重点】`GameplayEffectSpec` 是 [[w/unreal/gas/gameplayeffect|GameplayEffect]] 在运行时的实例化结果。编辑器里的 `GE` 资产只描述静态规则，而真正参与应用、复制、捕获和计算的是 `Spec`。

## 为什么 GE 应用前要先构造 Spec

因为应用效果时，除了“这是哪一个 GE”以外，往往还需要额外信息：

- 技能等级
- 施加者和命中的上下文 [[w/unreal/gas/effectcontext|EffectContext]]
- 动态传入的 `SetByCaller`
- 当次捕获到的标签与属性

这些都不是 `UGameplayEffect` 资产本身能保存的，所以必须先构造 `Spec`。

## Spec 里装了什么

从使用者视角，可以把它看成下面几块运行时数据的组合：

- **GE 定义**：引用的是哪一个 `GameplayEffect`
- **等级**：例如能力等级、缩放等级
- **EffectContext**：来源 Actor、命中结果、SourceObject、自定义上下文
- **动态参数**：最典型的是 `SetByCaller`
- **捕获结果 / 标签聚合**：给 [[w/unreal/gas/mmc|MMC]] 和 [[w/unreal/gas/execution-calculation|Execution Calculation]] 使用

## SetByCaller 的位置

【重点】`SetByCaller` 就是写在 `Spec` 上的动态键值对。

它适合存放“这次施法才知道”的数值，例如：

- 伤害值
- 治疗量
- 蓄力倍率
- 技能面板中选出来的动态参数

【例子】Aura 里常见做法是：

1. 创建伤害用的 `Spec`
2. 用伤害类型 Tag 作为 key 写入 `SetByCaller`
3. 在 [[w/unreal/gas/execution-calculation|Execution Calculation]] 中再读出这些值参与抗性和暴击结算

## 典型创建流程

```cpp
FGameplayEffectSpecHandle SpecHandle =
    SourceASC->MakeOutgoingSpec(DamageEffectClass, GetAbilityLevel(), SourceASC->MakeEffectContext());

UAbilitySystemBlueprintLibrary::AssignTagSetByCallerMagnitude(
    SpecHandle,
    GameplayTags.Damage,
    50.f
);
```

然后再把这份 `Spec` 应用给自己或目标：

- `ApplyGameplayEffectSpecToSelf`
- `ApplyGameplayEffectSpecToTarget`

## 它在运行时的角色

【重点】`Spec` 是 GAS 中连接“能力层”和“效果层”的桥。

- [[w/unreal/gas/gameplayability|GameplayAbility]] 负责创建它
- [[w/unreal/gas/mmc|MMC]] / [[w/unreal/gas/execution-calculation|Execution Calculation]] 负责读取它
- `ASC` 负责应用它
- `AttributeSet` 负责响应它最终带来的属性修改

## 和 GameplayEffect 的区别

- `GameplayEffect`：静态模板，描述规则
- `GameplayEffectSpec`：本次应用的运行时实例

可以把它理解成：

- `GameplayEffect` 像类定义
- `GameplayEffectSpec` 像这次真正拿去执行的一份对象状态

## 什么时候一定要用 Spec

下面这些场景基本都离不开 `Spec`：

- 需要 `SetByCaller`
- 需要自定义 [[w/unreal/gas/effectcontext|EffectContext]]
- 需要把效果先创建出来，延迟到稍后再命中应用
- 需要把一份效果通过投射物、事件或异步流程传递下去

【例子】投射物伤害就是典型场景：发射时创建 `Spec`，命中时再应用。

## 常见坑

- 【注意】不要去动态修改 `GameplayEffect` 资产本身；运行时变化应该写在 `Spec` 上。
- 【注意】`Spec` 创建后复制出去时，后续是否共享同一份数据要看你传递的是不是同一个 [[w/unreal/gas/gameplayeffectspechandle|GameplayEffectSpecHandle]]。
- 【技巧】当你发现“这个效果每次都不一样”时，优先想是不是应该把动态信息放进 `Spec` 而不是写死在 GE 中。

## 关联笔记

- [[w/unreal/gas/gameplayeffect|GameplayEffect]]
- [[w/unreal/gas/gameplayeffectspechandle|GameplayEffectSpecHandle]]
- [[w/unreal/gas/effectcontext|EffectContext]]
- [[w/unreal/gas/mmc|MMC]]
- [[w/unreal/gas/execution-calculation|Execution Calculation]]