---
title: UFUNCTION
description: UFUNCTION 说明符用于控制函数的反射、蓝图与 RPC 行为。
tags: [unreal, wiki, reflection, ufunction]
updated: 2025-04-18
---

## meta
元数据说明符（meta specifier）为函数提供了额外的描述信息。在本例中：
  ```cpp
  UFUNCTION(BlueprintCallable,Category = "Ability|Tasks",meta = (HidePin = "OwningAbility",DefaultToSelf = "OwningAbility"))  
static UTargetDataUnderMouse* CreateTaregtDataUnderMouse(UGameplayAbility* OwningAbility);
```
- HidePin = "OwningAbility" - 在蓝图图表中隐藏OwningAbility引脚（使界面更简洁）
- DefaultToSelf = "OwningAbility" - 当节点被放入蓝图时自动将该参数连接到所属技能
	这种用法常见于技能任务系统，既能简化蓝图的调用方式，又能在内部维持必需的OwningAbility引用。
- ExposeOnSpawn 暴露在生成上
  
需注意：元数据说明符不会影响运行时行为，仅用于优化编辑器和蓝图的使用体验。

### 暴露给蓝图函数的限制
如果将一个函数设置为了`BlueprintCallable`，我们将无法在子类中Override这个函数
### BlueprintNativeEvent
如果想要能被蓝图调用同时，也能C++重载实现，我们可以使用BlueprintNativeEvent，它将自动生成一个在C++中存在的虚拟native函数，我们依然可以在子类中进行重写

[[w/unreal/uproperty|UProperty]]