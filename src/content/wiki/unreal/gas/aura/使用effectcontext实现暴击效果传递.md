---
title: 使用EffectContext实现暴击效果传递
description: 记录通过自定义 EffectContext 传递暴击信息的实现步骤。
tags: [unreal, gas, post, aura, effect-context]
updated: 2025-05-01
---

```cpp
FGameplayEffectContextHandle EffectContextHandle=SourceASC->MakeEffectContext();  
EffectContextHandle.SetAbility(this);  
EffectContextHandle.AddSourceObject(Projectile);  
TArray<TWeakObjectPtr<AActor>> Actors;  
Actors.Add(Projectile);  
EffectContextHandle.AddActors(Actors);  
FHitResult HitResult;  
HitResult.Location= ProjectileTargetLocation;  
EffectContextHandle.AddHitResult(HitResult);
```
[[w/unreal/gas/effectcontext|EffectContext]]

## 如何使用我们定义好的FAuraGameplayEffectContext结构体
### 定义我们自己的Globals类
创建`AuraAbilitySystemGlobals`
 重载实现`AllocGameplayEffectContext`
 在`DefaultGame.ini中`配置我们的`AbilitySystemGlobals`类