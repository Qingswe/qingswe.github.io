---
title: 核心类型
description: 虚幻引擎中 Subsystem 的层级、生命周期与依赖初始化。
tags: [Unreal, Architecture]
updated: 2025-11-27
---

Subsystem是引擎提供的一套高度结构化的全局服务管理光家
模块化：将游戏功能拆解为独立子系统，避免代码耦合
自动声明周期管理：引擎自动创建/销毁，无需手动调用 new/delete
引擎深度集成：与UE的反射系统、垃圾回收机制无缝协作
作用域隔离：不同子系统绑定到不同层级对象（如GameInstance、World）
# 核心类型
![[w/unreal/subsystem-1.png|SubSystem-1.png]]
EngineSub
GameInstanceSub
EditorSub
LocalPlayerSub
WorldSub

# Subsystem的生成顺序
### ShouldCreateSubsystem

### Initialize
通过传入的 FSubsystemCollectionBase 来决定生成顺序

![[w/unreal/subsystem.png|SubSystem.png]]
运行到每个Subsystem的Initialize时，可以选择带代码中添加 `Collection.InitializeDependency<T>()`的检查，并将需要的Subsystem进行初始化

# Next
[[w/unreal/资源加载|资源加载]]