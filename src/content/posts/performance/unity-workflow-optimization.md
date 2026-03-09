---
title: Unity 工作流优化
published: 2025-02-16
description: '总结 Unity 工程目录、Assets 结构与资源导入工作流的优化思路。'
tags: [unity, performance, workflow, asset-pipeline]
category: Unity Engine
draft: false
---
# 工程目录和Assets目录设置
## 工程目录结构及用途
- Asset文件夹：用来存储和重用的项目资产
- Library文件夹：用来存储项目内部资产数据信息的目录
- Packages文件夹：用来存储项目的包文件信息
- Project Settings文件夹：用来存储项目设置的信息 建议托管
- UserSettings文件夹：用来存储用户设置信息 建议托管
- Temp文件夹：用来存储使用Unity编辑器打开项目时的临时数据，一旦关闭Unity编辑器也会呗删除
- Logs文件夹：用来存储项目的日志信息息（不包含编辑器日志信息)
## Unity Assets目录中的特殊文件夹及用途
空降 https://www.bilibili.com/video/BV1q34y1r7B8/?share_source=copy_web&vd_source=05da026b7dc230f4f358b96808ee390b&t=198
Editor文件夹(可以多个)
Editor Default Resources文件夹 （根目录唯一)
Gizmos文件夹(根目录唯一)
Plugins文件夹(2019后已无）
Resources文件夹
可以添加多个，也可以是Editor文件夹的子文件夹，但资源要通过==Editor脚本进行加载，会从构建发布中剥离==
==这个里面的资源会生成一份红黑树，常驻占用内存==
Standard Assets文件夹 仅能一个，编译级别最高
StreamingAssets文件夹
忽略导入的文件夹
1. 隐藏的文件夹
2. 以”“开头的文件和文件夹
3. 以”～“结尾的文件和文件夹
4. 扩展名为cVs的文件和文件夹
5. 扩展名为.tmp的文件夹
# Assets目录设计原则
### 一级目录设计原则
目录尽可能少
区分编辑模式与运行模式
==区分工程大版本，比如按Mod或dlc方式划分访问场景文件、全局配置文件便捷==
==不在一级目录做资源类别区分==，只有Video类视频建议直接放到StreamAssets下
![](/images/performance/Unity工作流优化.png)
### 二级目录设计原则
- ==只区分资源类型==
- 资源类型大类划分要齐全
- **不做子类型区分**
- 不做功能区分
- 不做生命周期区分
![](/images/performance/Unity工作流优化-1.png)
### 三级目录设计原则
- Audio/Texture/Models三级目录做子类型区分
- 其他类型资源做功能模块/生命周期区分
![](/images/performance/Unity工作流优化-2.png)LoadType划分
![](/images/performance/Unity工作流优化-3.png)
蒙皮划分
![](/images/performance/Unity工作流优化-4.png)
贴图类型划分
其他可以按照功能模块或生命周期来划分
### 四级目录设计原则
只有Audio/Texture/Models做四级目录，按模块/生命周期划分

# 资源导入
将外部资源导入后分类
三种方案
## 手动编写工具
优点：根据项目特点自定义安排导入工作流，并且可以和后续资源制作与大包工作流结合
缺点：存在开发和维护成本，会让编辑器菜单界面变得复杂，对新人理解工程不友好
适合类型：大型商业游戏团队
### 内容
![](/images/performance/Unity工作流优化-5.png)

![](/images/performance/Unity工作流优化-6.png)

## 利用Presets功能
优点：使用简单方便，只需要Assets目录结构合理规范即可
缺点：无法和后续工作流整合，只适合做资源导入设置。
适合类型：小型团队或中小规模项目
### 什么是Presets
Presets是将相同属性设置跨多个组件、资源或项目设置保存和应用的资源，该资源运行时没有效果，仅能在Unity编辑器下使用。

可以添加高级过滤器搜索

### 如何解决误操作等带来的导入设置变化问题
使用之前提到过的AssetModifiedProcessor代码，先在 PresetManager 中删除之前的配置，然后将配置移动到目标文件夹，用代码将文件夹下的所有资源一并设置

## 利用AssetGraph工具
优点：功能全，覆盖Unity资源工作流全流程，节点化编辑，直观
缺点：有一定上手成本，一些自定义生成节点也需要开发，不是Unity标准包，Unity新功能支持较慢
适合类型：任何规模项目和中大型团队

# 后记
可以使用熊佬的 资源管线管理工具
