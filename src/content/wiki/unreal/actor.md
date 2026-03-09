---
title: Actor
description: 虚幻引擎中 Actor 的基础概念、职责与定位。
tags: [unreal, wiki, actor, core-concept]
updated: 2025-05-06
---

# Actor

## Actor 是什么

`Actor` 是存在于 `World` 中、可以被生成和销毁、可以挂载组件、可以参与关卡逻辑的基础对象。

如果拿 Unity 类比：

- `Actor` 更接近 `GameObject`
- `ActorComponent` / `SceneComponent` 更接近挂在其上的各种组件

但 Unreal 的重点不只是“场景节点”，而是：**一切需要进入世界、参与生命周期、被复制、被控制或被放进关卡中的对象，通常都从 Actor 体系出发。**

## 和 UObject / Pawn / Character 的关系

继承关系可以简单理解为：

`UObject -> Actor -> Pawn -> Character`

- [[w/unreal/万物之始-uobject|万物之始 UObject]]：反射系统和 GC 的基础对象，不一定存在于世界中
- `Actor`：进入世界后的对象，拥有位置、组件和生命周期
- [[w/unreal/pawn|Pawn]]：可以被 `Controller` 控制的 `Actor`
- [[w/unreal/character|Character]]：面向人形角色的 `Pawn`

一个常见判断标准是：

- 只是数据、配置、工具对象：优先考虑 `UObject`
- 需要出现在场景里：考虑 `Actor`
- 需要被玩家或 AI 控制：考虑 `Pawn`
- 是常规人形角色：优先考虑 `Character`

## Actor 的核心职责

- 挂载和组织组件
- 参与关卡中的生成、销毁和 Tick
- 作为网络复制、碰撞、交互的承载体
- 给蓝图和设计师提供可摆放、可实例化的对象

Actor 自己通常只负责“对象级别”的职责，真正的功能往往拆给组件，例如：

- 碰撞给 `UPrimitiveComponent`
- 视觉表现给 `StaticMeshComponent` / `SkeletalMeshComponent`
- 移动给 `MovementComponent`
- 自定义逻辑给 [[w/unreal/actorcomponent|ActorComponent]]

## 常见生命周期

更完整的创建与销毁流程见 [[w/unreal/actor创建与销毁|Actor创建与销毁]]，这里只记最常用的入口。

### 构造阶段

- C++ 构造函数：创建默认子对象，配置默认值
- `OnConstruction`：实例被放入关卡或属性修改后重建

### 运行阶段

- `BeginPlay()`：进入游戏后开始执行
- `Tick(float DeltaTime)`：每帧更新，前提是开启 Tick
- `EndPlay(const EEndPlayReason::Type EndPlayReason)`：离场、销毁或关卡切换前清理
- `Destroyed()`：对象被销毁后的通知入口

实际使用上：

- 初始化引用、启动逻辑放 `BeginPlay`
- 每帧驱动逻辑放 `Tick`
- 释放资源、解绑委托放 `EndPlay`
- 通知外部“我已经被销毁”放 `Destroyed`

## 常见 API

### 生成与销毁

```cpp
AActor* SpawnedActor = GetWorld()->SpawnActor<AActor>(ActorClass, SpawnTransform);

if (SpawnedActor)
{
    SpawnedActor->SetLifeSpan(5.0f);
}
```

- `GetWorld()->SpawnActor<T>()`：生成 Actor
- `Destroy()`：主动销毁
- `SetLifeSpan()`：延迟销毁

### 组件相关

- `CreateDefaultSubobject<T>()`：在构造函数中创建默认组件
- `SetRootComponent()`：设置根组件
- `FindComponentByClass<T>()`：查找指定类型组件
- `GetRootComponent()`：获取根组件

### 变换与附着

- `SetActorLocation()`
- `SetActorRotation()`
- `SetActorTransform()`
- `AttachToActor()`

### 运行状态

- `GetWorld()`
- `GetOwner()`
- `HasAuthority()`
- `IsActorBeingDestroyed()`

## 什么时候应该创建 Actor

适合使用 Actor 的场景：

- 场景中的机关、门、箱子、投射物、拾取物
- 需要被生成出来的敌人、NPC、载具
- 需要放到关卡里并由设计师调参数的对象

不适合直接建成 Actor 的场景：

- 纯数据对象
- 只做算法处理的帮助类
- 不需要进入世界的管理器

这类对象更适合放到 `UObject`、`Subsystem` 或普通 C++ 类里。

## 开发时的经验

- 不要把所有逻辑都堆在 Actor 上，优先拆成组件
- 需要编辑器可调参数的字段，记得配合 [[w/unreal/uproperty|UPROPERTY]]
- Actor 的创建依赖 `World`，不要误用 `NewObject` 去创建 Actor
- 如果对象根本不需要在世界中出现，就别为了“方便”强行做成 Actor

Next:
[[w/unreal/actorcomponent|ActorComponent]]