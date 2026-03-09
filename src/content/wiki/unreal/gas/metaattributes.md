---
title: MetaAttributes
description: Meta Attributes 作为伤害等中间结果的临时属性通道。
tags: [Unreal, GAS]
updated: 2025-04-23
---

在游戏中，我们通常不是直接将伤害应用到生命值中，要实际应用这个值，我们还需要根据 攻击者和被攻击者的属性做一些操作进行计算。所以我们就需要一个中介，在实际应用之前执行所有必要的数学运算，这就是MetaAttributes

### 与普通属性的区别
==普通属性会被复制同步到客户端，但元属性不会==，实际上只是一个临时占位符。在执行完成计算后，才将更改应用于实际的属性

元属性中我们可以使用 PostEffect来检查变化的属性，比如 受害者是否进行了闪避或格挡，是否产生了暴击，在施加伤害时是否拥有属性的加成。完成运算后再将最终产生的结果从生命值中减去。
还有造成伤害后的反应机制
- 根据是否暴击显示不同的伤害效果
- 根据伤害类型或计算结果，施加减益效果（烧伤、眩晕、减速）
- 根据受害者身上的GE触发其他效果（反伤、吸血、连锁反应）
![MetaAttributes.png](/images/unreal/MetaAttributes.png)
```cpp
void UAuraAttributeSet::PostGameplayEffectExecute(const struct FGameplayEffectModCallbackData& Data)  
{  
    Super::PostGameplayEffectExecute(Data);  
  
    FEffectProperties Props;  
    SetEffectProperties(Data, Props);  
  
	if (Data.EvaluatedData.Attribute == GetIncomingDamageAttribute())  
    {       const float LocalIncomingDamage = GetIncomingDamage();  
       SetIncomingDamage(0.f);  
       if (LocalIncomingDamage>0.f)  
       {          const float NewHealth = GetHealth()-LocalIncomingDamage;  
          SetHealth(FMath::Clamp(NewHealth, 0.f, GetMaxHealth()));  
  
          const bool bFatal = NewHealth <= 0.f;  
       }    }}
```
### 向GE传入数值
```cpp
const UAbilitySystemComponent* SourceASC =  UAbilitySystemBlueprintLibrary::GetAbilitySystemComponent(GetAvatarActorFromActorInfo());  
const FGameplayEffectSpecHandle SpecHandle = SourceASC->MakeOutgoingSpec(DamageEffectClass,GetAbilityLevel(),SourceASC->MakeEffectContext());  
  
FAuraGameplayTags GameplayTags = FAuraGameplayTags::Get();  
// 创建一个KeyPair，将GameplayTags.Damage的值赋给SpecHandle  
UAbilitySystemBlueprintLibrary::AssignTagSetByCallerMagnitude(SpecHandle,GameplayTags.Damage,50.f);  
  
Projectile->DamageEffectSpecHandle = SpecHandle;
```
![MetaAttributes-1.png](/images/unreal/MetaAttributes-1.png)最终向IncomingDamage中设置的就是 GE Spec生成时，传入的 `GamplayTag.Damage`KeyPair的数值`50`