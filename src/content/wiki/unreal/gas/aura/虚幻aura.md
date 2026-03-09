---
title: 虚幻Aura
description: Aura 学习过程中的属性、标签和项目实现笔记。
tags: [Unreal, GAS, Aura]
updated: 2025-03-29
---

## PreAttributeChange
![虚幻Aura.png](/images/unreal/虚幻Aura.png)
“预属性变化”是指在属性值发生改变前对其进行修改的功能，它由任何改变属性的操作触发，例如通过设置器或游戏效果，但不会永久改变属性的修饰符，仅影响查询时的返回值。随后还有其他操作会根据所有相关修饰符重新计算当前值。
**如果健康值因故发生变化，后续操作会重新计算该变化，导致之前的限制无效，需要再次限制，因此在属性变化前进行最终限制并非最佳选择。更好的方法是使用“post-gameplay effect execute”函数，它在游戏效果改变属性后执行，确保变化是最终的**

- 可以在Rider 中框选区域后使用Ctrl+H来替换里面的内容
- `Ctrl+K +O`可以在`.cpp`文件和`.h`文件之间切换

## GameplayTags
基本上就是名称，但是名称之间会有`·`进行划分层级，以父-子-孙的形式存在
### 配置
配置Tag有两种方式
1. 使用Edit-GamePlayTag下的页面进行设置
2. 通过制作数据表
	在Content文件夹中创建DataTable文件(GameplayTag格式)，并在Edit下的选项卡中选中该表

### Lambda表达式
```cpp
Cast<UAuraAbilitySystemComponent>(AbilitySystemComponent)->EffectAssetTags.AddLambda(  
    [](const FGameplayTagContainer& AssetTags)  
    {       for (const FGameplayTag& Tag :AssetTags)  
       {          // TODO Broadcast the tag to the WidgetController  
          const FString Msg = FString::Printf(TEXT("GE TAG: %s"),*Tag.ToString());  
          GEngine->AddOnScreenDebugMessage(-1,8.f,FColor::Blue,Msg);  
       }    });
```



[[w/unreal/虚幻动画|虚幻动画]]