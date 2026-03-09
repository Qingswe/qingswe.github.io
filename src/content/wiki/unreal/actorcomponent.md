---
title: ActorComponent
description: 虚幻引擎中 ActorComponent 的作用、类型与反射要点。
tags: [Unreal, Actor]
updated: 2025-11-25
---

## 概述

在 Unity 中，ActorComponent 类似于 MonoBehaviour，需要继承于该类，才能被挂载在 Actor 上。

**Unity vs Unreal 的区别：**
- Unity 中的 GameObject 上会自带一个 Transform 组件
- 虚幻中，如果 Actor 上没有变换组件的话，则无法对变换相关的属性进行修改

## 组件类型

在游戏中，我们可以继承自两种组件：

- **USceneComponent**：带有变换的组件
- **UActorComponent**：纯逻辑的组件

## 反射宏

### UPROPERTY

在虚幻 5 中，`UObject` 类型字段更推荐写成 `TObjectPtr<T>`，尤其是组件引用，这样更符合当前引擎的对象引用习惯。

**重要：** 如果不添加 `UPROPERTY` 反射宏，随时都有可能被垃圾回收（因为继承自 `UObject`）。

声明时在括号内部，可以增加反射说明符：

- **VisibleAnywhere**：可以在编辑器窗口中看见，但是无法编辑。也就是以只读的方式显示在编辑器窗口中

### UFUNCTION

常见函数说明符：

- `BlueprintCallable`：允许在蓝图中调用
- `BlueprintPure`：纯函数，没有执行引脚，适合 Get 类逻辑
- `BlueprintImplementableEvent`：仅声明，由蓝图实现
- `BlueprintNativeEvent`：可在 C++ 中给默认实现，也可被蓝图覆写

典型写法：

```cpp
UFUNCTION(BlueprintCallable, Category = "Combat")
void StartAttack();
```

## 组件层级

![[w/unreal/actorcomponent.png|ActorComponent.png]]

**Unity vs Unreal 的区别：**
- Unity 中，每个 GameObject 上挂载的组件都是平级的关系
- Unreal 中，各种组件之间是存在层级关系的

**相关 API：**
- `SetRootComponent`：设置根组件
- `SetupAttachment`：设置组件附着关系
- `ComponentTags.Add("")`：为组件打标签

**注意：** 纯逻辑组件（直接继承于 `UActorComponent`）没有空间变换，不能像 `USceneComponent` 一样形成父子变换层级。

[[w/unreal/text宏|TEXT宏]]

## 创建自己的组件类

在 Rider 中创建新类继承于 `ActorComponent`。

ActorComponent 注册逻辑是为了给游戏对象提供某种功能，都是功能逻辑。

## 组件的生命周期

### 创建

常见有两种创建方式：

- 构造函数中通过 `CreateDefaultSubobject` 创建默认组件
- 运行时通过 `NewObject` 动态创建，然后 `RegisterComponent`

```cpp
HealthComponent = CreateDefaultSubobject<UMyHealthComponent>(TEXT("HealthComponent"));
```

```cpp
UMyLogicComponent* RuntimeComponent = NewObject<UMyLogicComponent>(this);
RuntimeComponent->RegisterComponent();
```

如果是 `USceneComponent`，运行时还要额外处理附着关系：

```cpp
RuntimeSceneComponent->AttachToComponent(GetRootComponent(), FAttachmentTransformRules::KeepRelativeTransform);
```

### 注册流程

组件真正开始参与世界逻辑，关键在于“注册”：

1. 创建组件对象
2. 绑定到所属 Actor
3. `OnRegister`
4. `InitializeComponent`
5. 跟随 Actor 进入 `BeginPlay`

默认子对象通常由引擎自动完成注册；运行时动态组件要自己记得 `RegisterComponent()`。

### 销毁

可以获取对应的 ActorComponent，然后调用 `DestroyComponent()`。

**注意：** 在调用销毁过后，一定要将该指针置空。

```cpp
MyLogicComponent->DestroyComponent();
MyLogicComponent = nullptr;
```

### 运行阶段常见入口

- `BeginPlay()`：游戏开始
- `TickComponent()`：每帧更新
- `EndPlay()`：结束前清理
- `OnRegister()`：注册到世界时调用
- `OnUnregister()`：取消注册时调用

如果组件需要 Tick，还要在构造中开启：

```cpp
PrimaryComponentTick.bCanEverTick = true;
```

### 获取

关于获取组件，可以在 Actor 上使用以下方法：

- `FindComponentByClass<T>()`：开销较大
- `FindComponentByTag<T>()`：开销相对较小

## UActorComponent 和 USceneComponent 的区别

- `UActorComponent`：适合纯逻辑功能，例如属性系统、锁定系统、技能冷却管理
- `USceneComponent`：带有位置、旋转、缩放，可以形成层级

简单理解：

- 需要“挂点”和空间关系，就用 `USceneComponent`
- 只需要复用功能，不关心空间信息，就用 `UActorComponent`

## 什么时候适合拆成组件

- 同一套功能会被多个 Actor 复用
- 想把“对象表现”和“对象能力”拆开
- 逻辑本身可以独立测试或独立开关

不建议把所有系统都堆成一个超大组件。组件是为了解耦，不是把复杂度换个位置继续集中。

Next:
[[w/unreal/pawn-controller-gamemode|Pawn-Controller-GameMode]]