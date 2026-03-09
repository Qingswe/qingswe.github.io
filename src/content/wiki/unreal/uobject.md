---
title: UObject
description: Unreal 中 UObject 的定位、反射能力、创建方式与 GC 引用规则。
tags: [unreal, wiki, uobject, reflection, gc]
updated: 2026-03-08
---

# UObject

## UObject 是什么

`UObject` 是 Unreal 对象系统的基础类。

它本身不等于“场景里的物体”，而是负责把一个类型接入 Unreal 的对象框架。只要类进入 `UObject` 体系，就可以逐步获得反射、序列化、垃圾回收、编辑器集成和运行时类型识别这些能力。

很多核心类型都建立在它上面，例如：

- [[w/unreal/actor|Actor]]
- [[w/unreal/actorcomponent|ActorComponent]]
- [[w/unreal/gameinstance|GameInstance]]
- [[w/unreal/subsystem|SubSystem]]
- `UUserWidget`
- `UDataAsset`

## 它的核心作用

### 反射

通过 `UCLASS`、[[w/unreal/uproperty|UPROPERTY]]、`UFUNCTION` 这些宏，Unreal Header Tool 会为类型生成反射信息。

这让引擎可以：

- 在编辑器中显示和修改属性
- 在蓝图中访问字段和函数
- 在运行时通过 `GetClass()`、`IsA()`、`Cast<>` 做类型判断
- 让序列化、复制和存档系统识别对象成员

### 垃圾回收

`UObject` 由 Unreal 的 GC 管理，不应该像普通 C++ 对象那样直接 `delete`。

真正重要的不是“这个对象创建出来了没有”，而是“这个对象是否仍然被引擎能识别的引用链持有”。

### 统一对象模型

`UObject` 体系把类定义、默认值、实例、反射元数据和对象关系放进了同一套系统里。

这也是为什么 Unreal 中很多 API 都围绕 `UClass`、`GetClass()`、`GetOuter()`、`GetDefault<>()` 展开。

## 和 Actor 的关系

继承关系可以先记成：

`UObject -> Actor -> Pawn -> Character`

两者的差别是：

- `UObject` 不直接进入 `World`
- [[w/unreal/actor|Actor]] 是存在于世界中的对象，能被放进关卡、生成、销毁、复制并挂组件

一个实用判断标准是：

- 只是数据、配置、运行时逻辑对象：优先考虑 `UObject`
- 需要真正存在于场景里：考虑 [[w/unreal/actor|Actor]]

## UClass 和 CDO

官方文档里有一个很关键的点：每个 `UCLASS` 都会有对应的 `UClass` 描述对象，以及一个 `Class Default Object`，也就是 `CDO`。

可以先这样理解：

- `UClass` 是这个类型在反射系统里的运行时描述
- `CDO` 是这个类的默认对象模板

通常：

- `GetClass()` 用来拿实例的类型信息
- `GetDefault<T>()` 用来读取这个类的默认值

这也解释了为什么 `UObject` 构造函数更适合做“默认值初始化”，而不是运行时业务逻辑。

## 创建规则

### 运行时创建

运行时创建 `UObject`，使用 `NewObject<>()`：

```cpp
UMyObject* MyObject = NewObject<UMyObject>(Outer);
```

这里的 `Outer` 代表对象归属关系和命名层级。它通常应该是一个合理的宿主对象，而不是随便传。

### 构造期创建默认子对象

如果是在构造函数里创建默认子对象，使用 `CreateDefaultSubobject<>()`：

```cpp
MySubobject = CreateDefaultSubobject<UMySubobject>(TEXT("MySubobject"));
```

这更常见于 `Actor` 和 `Component` 的构造阶段，用来建立默认组件或默认子对象结构。

### 不要这样创建

官方文档明确建议：

- 不要用 `new` 创建 `UObject`
- 不要用 `delete` 销毁 `UObject`
- `UObject` 不支持构造函数参数

## 构造函数该做什么

`UObject` 构造函数应该尽量轻量。

更适合放进去的是：

- 默认值初始化
- 默认子对象创建
- 静态资源绑定

不适合放进去的是：

- 依赖运行时世界状态的逻辑
- 复杂业务初始化
- 期望对象已经完全进入运行时系统后的调用

这点对 [[w/unreal/actor|Actor]] 也很重要，因为很多初始化逻辑应该放到 `BeginPlay()` 等后续阶段，而不是构造函数里。

## GC 与引用规则

### 持久引用

在 UE5 里，如果一个 `UObject` 字段需要被 GC 跟踪、序列化或复制，优先使用：

```cpp
UPROPERTY()
TObjectPtr<UMyObject> MyObject;
```

根据官方文档，`TObjectPtr<T>` 在被 `UPROPERTY` 标记时，才会作为强引用参与 GC 跟踪。

### 弱引用

如果只是缓存一个对象，不想阻止它被回收，使用：

```cpp
TWeakObjectPtr<UMyObject> MyObject;
```

对象被销毁或 GC 后，弱引用会失效。

### 软引用

如果引用的是资产，且希望按需加载，使用：

```cpp
UPROPERTY(EditAnywhere)
TSoftObjectPtr<UTexture2D> Icon;
```

它保存的是对象路径，不会因为存在这个引用就强行把资产常驻内存。

### 非 UObject 持有者里的强引用

如果持有者本身不是 `UObject`，不能写 `UPROPERTY`，这时才考虑：

```cpp
TStrongObjectPtr<UMyObject> MyObject;
```

官方文档对它的建议是“谨慎使用”，因为它会直接影响 GC，并且创建和销毁成本更高。

### 裸指针的边界

裸指针 `T*` 仍然适合：

- 局部变量
- 函数参数
- 短生命周期的临时访问

但不适合拿来充当长期、可追踪的 `UObject` 成员引用。

## Outer 该怎么理解

`Outer` 可以理解成对象的归属容器或外层对象。

它主要影响：

- 对象路径和命名层级
- 对象组织关系
- 某些实例化和默认子对象行为

经验上，`Outer` 应该反映真实宿主关系，但它不等价于“可以完全替代 GC 可见引用”。如果一个对象需要被长期持有，仍然应该优先通过 `UPROPERTY` 或其他引擎认可的引用方式管理。

## 常见 API

- `GetClass()`：获取对象的 `UClass`
- `GetOuter()`：获取外层对象
- `GetName()`：获取对象名
- `IsA()`：判断类型
- `Cast<T>()`：安全转换到目标 `UObject` 类型
- `GetDefault<T>()`：获取类默认对象

## 什么时候应该用 UObject

适合做成 `UObject` 的场景：

- 配置对象
- 数据模型
- 技能运行时状态对象
- 管理器内部的逻辑对象
- 不需要进入场景的工具对象

不适合直接做成 `UObject` 的场景：

- 需要放进关卡的实体
- 需要位置、旋转、碰撞和 Tick 的对象

这些通常应该转向 [[w/unreal/actor|Actor]] 或组件体系。

## 常见误区

- 以为 `UObject` 能像普通 C++ 类一样随便 `new` / `delete`
- 以为有一个裸指针成员就足够阻止 GC
- 把运行时初始化逻辑塞进构造函数
- 在 `UObject` 上套用 `TSharedPtr` / `TUniquePtr` 这一类普通 C++ 所有权模型

官方文档明确指出：Shared Pointer 体系不适用于 `UObject` 类。

## 延伸阅读

- [[w/unreal/万物之始-uobject|万物之始 UObject]]
- [[w/unreal/uproperty|UPROPERTY]]
- [[w/unreal/actor|Actor]]
- [[w/unreal/gameinstance|GameInstance]]
- [[w/unreal/subsystem|SubSystem]]

## 参考

- [Objects in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/objects-in-unreal-engine)
- [Object Pointers in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine)
- [GetDefault API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/CoreUObject/GetDefault)
- [Shared Pointers in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/shared-pointers-in-unreal-engine)