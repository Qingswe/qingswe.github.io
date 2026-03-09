---
title: Aura Home
description: Aura 项目下伤害、上下文与标签体系的导航页。
tags: [unreal, gas, wiki, aura, moc]
updated: 2025-04-24
---

# Aura Home

这里收拢 Aura 项目里和 GAS 直接相关的实现笔记，重点是伤害链路、上下文扩展和项目级标签设计。

## 伤害链路

- [[w/unreal/gas/aura/伤害计算|伤害计算]]
- [[w/unreal/gas/aura/创建伤害类型|创建伤害类型]]
- [[w/unreal/gas/metaattributes|MetaAttributes]]
- [[w/unreal/gas/execution-calculation|Execution Calculation]]

## 上下文与序列化

- [[w/unreal/gas/effectcontext|EffectContext]]
- [[w/unreal/gas/aura/使用effectcontext实现暴击效果传递|使用EffectContext实现暴击效果传递]]
- [[w/unreal/gas/related/netserialize|NetSerialize]]
- [[w/unreal/gas/related/unreal类型转换|Unreal类型转换]]

## 项目笔记

- [[w/unreal/gas/aura/虚幻aura|虚幻Aura]]
- [[w/unreal/gas/related/虚幻中的调试|虚幻中的调试]]
- [[w/unreal/gas/attributes/uclass|UClass]]

### 声明静态单例类
```cpp
struct AuraDamageStatics  
{  
    AuraDamageStatics()  
    {           }  
};  
  
// 创建一个 没有动态内存分配和指针等特性的 单一实例  
// 当在一个静态函数内部创建一个静态变量时，每次调用这个函数，都会得到那个相同的对象，函数结束，这个地址并不会消失  
static const AuraDamageStatics& DamageStatics()  
{  
    static AuraDamageStatics DStatics;  
    return DStatics;  
}
```

### 声明宏
```cpp
#define DEFINE_ATTRIBUTE_CAPTUREDEF(S, P, T, B) \  
{ \  
    P##Property = FindFieldChecked<FProperty>(S::StaticClass(), GET_MEMBER_NAME_CHECKED(S, P)); \  
    P##Def = FGameplayEffectAttributeCaptureDefinition(P##Property, EGameplayEffectAttributeCaptureSource::T, B); \  
}
```
使用传入的字符，使用 固定的模板替换相关的 关键词 创建声明
## RPG角色类别设计
- Warrior 战士
- Ranger 远程
- 元素法师