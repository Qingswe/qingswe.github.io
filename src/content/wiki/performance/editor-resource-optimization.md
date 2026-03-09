---
title: 编辑器创建资源优化
description: 整理场景、Prefab、UGUI、物理与动画资源在 Unity 编辑器侧的优化方法。
tags: [unity, performance, editor, asset-pipeline]
updated: 2025-02-16
---
# 场景
场景的结构需要开发者在开发时按自己的游戏类型和场景类型合理设置
## 场景设计原则
![](/images/performance/编辑器创建资源优化-6.png)
![](/images/performance/编辑器创建资源优化-7.png)
1. 合理设计场景一级节点的同时，避免场景节点深度太深，**一些代码生成的游戏对象如果不需要随父节点进行Transform的，一律放到根节点下。**
	unity在2017后，Transform数据在内存上设计变为连续存储。并通过transform dirty标记逐级进行设置 来实现级联变换的。也就是在根节点下效率会更高，最高可相差几十倍
2. 尽量使用Prefab节点构建场景，而不是直接创建的GameObject节点。
	如果Prefab的bundle已经加载到内存中，更换场景时，不会需要额外内存。只需要引用prefab对象。所以不论从加载速度、内存、还是包体上，prefab优化都要更好
3. 避免DontDestroyOnLoad节点下太多生命周期太长或引用资源过多的复杂节点对象。Additive场景尤其要注意
	如果真的需要跨场景资源，切换场景前应该先清理不用的资源
4. 最好为一些需要经常访问的节点添加tag，静态节点一定要添加Static标记
	这样我们可以不用讲一些对象的引用添加到公开属性中，节省多个游戏对象使用相同脚本时，编码的时间。只需要使用GameObject.FindWithTag即可查找到
	给常用的游戏对象设置Tag可以极大地提高场景对象的搜索效率
# 预制体
由于预制体系统可以自动保持所有实例副本同步，因此可以比单纯地简单复制粘贴游戏对象做到更好的对象管理。
此外通过预制体嵌套(NestedPrefabs)可以将一个预制体嵌套到另一个预制体中，从而创建多个易于编辑的复杂游戏对象层级视图。
可以通过覆盖各个预制体实例的设置来创建预制体变体(PrefabsVariant），从而可以将一系列覆盖组合在一起形成有意义预制体的变化。
## 嵌套预制体的优缺点
优点：
- 嵌套预制体方便预制体管理，方面资源重复利用，易于统计场景复杂度
- 美术制作时可以比较合理的分配UV,和贴图利用率
- 方便关卡设计人员发挥，充分合理利用资源
- 嵌套预制体比较方便利用工具做LOD，LOD效果也比较好
- 嵌套预制体修改方便，只需替换子预制体可以做到所有预制体同步
- 比较方便做场景遮挡剔除，可以做到精细的遮挡剔除优化效果
缺点：
- 手动做Bundle依赖时要按Scene方式处理，依赖关系较为复杂
- 可能会增加材质数量与Drawcall数量 但由于遮挡剔除Occlusion Culling与SRP Batcher的存在，在合理的设计与场景优化后，问题不严重
- 不太适合做大规模远景对象 在远景尽量采用模型替代品的方式实现，甚至可以用模型面片
- 美术与关卡设计人员要充分考虑组合复杂度与特例场景显示，避免重复性和单一性，需要跟多的沟通成本
## 预制体变体
- 不能改变本体Prefab游戏对象（GameObject）层级
- 不能删除本体Prefab中的游戏对象，但可以通过Deactive游戏对象来达到与删除游戏对象同样的效果
- 对于Prefab变体要保持其Override属性的变化，不能通过Apply tobase把这些变化应用到本体Prefab上，这样会破坏基础Prefab的结构和功能。
变体对象是不过是 本体Prefab 的一个Instance实例而已

# UGUI
## 四类问题
- Canvas s Re-batch 时间过长
- Canvas Over-dirty,Re-batch次数过多
- 生成网格顶点时间过长
- Fill-rate overutilization
## Canvas
Canvas负责管理UGUI元素，负责UI渲染网格的生成与更新并向GPU发送DrawCall指令
 每个Canvas在绘制之前，都要一个合批的过程。如果Canvas下元素每一帧都保持不变，只需要在绘制前合批一次，并保存下结果，在之后的每帧的渲染中继续使用这个结果
 如果UI元素发生了变化 ，画布需要重新匹配几何体，画布被标记为dirty，dirty的canvas会触发Rebatch重新进行合批
 ### Canvas Re-batch过程
- 根据UI元素深度关系进行排序
- 检查UI元素的覆盖关系
- 检查UI元素材质并进行合批
合批过程是多线程运行的

## 渲染细节
- UGUI中渲染是在Transparent半透明渲染队列中完成的，半透明队列的绘制顺序是从后往前画，于Ui元素做Alpha Blend,我们在做UI时很难保障每一个像素不被重画，UI的Overdraw太高这会造成片元着色器利用率过高，造成GPU负担。
- UI SpriteAtlas图集利用率不高的情况下，大量完全透明的像素被采样也会导致像素被重绘，再成片元着色器利用率过高；同时纹理采样器浪费了大量采样在无效的像素上，导致需要采样的图集像素不能尽快的被采样，造成纹理采样器的填充率过低同样也会带来性能问题。
## Re-Build 过程
在WillRenderCanvases事件调用PerformUpdate:CanvasUpdateRegistry接口
	通过ICanvasElement.Rebuild方法重新构建Dirty的Layout组件
	通过ClippingRegistry.Cullf方法，任何已注册的裁剪组件Clipping Compnents(Such as Masks)的对象进行裁剪剔除操作
	任何Dirty的 Graphics Compnents都会被要求重新生成图形元素
Layout Rebuild
	UI元素位置、大小、颜色发生变化
	优先计算靠近Root节点，并根据层级深度排序
Graphic Rebuild
	顶点数据被标记成Dirty
	材质或贴图数据被标记成Dirty
## 使用基本准则
1. 将所有可能打断合批的层移到最下边的图层，尽量避免UI元素出现重叠区域
2. 可以拆分使用**多个同级**或**嵌套**的Canvas来减少Canvas的Rebatch复杂度
	所有Rebatch和Rebuild都是针对单独Canvas进行的，不会跨Canvas合批
3. 拆分动态和静态对象放到不同Canvas下。
4. 不使用Layout组件
5. Canvas的RenderMode尽量Overlay模式，减少Camera调用的开销
	这是由于 SRP 中Camera Stack的存在，每个Camera不论Base还是Overlay都会带来额外开销，开销与Camera个数正相关
## 射线 优化
- 必要的需要交互Ul组件才开启“RaycastTarget'
- 开启“RaycastTargets”的Ui组件越少，层级越浅，性能越好
- 对于复杂的控件，尽量在根节点开启“RaycastTarget'，比如按钮底板
- 对于嵌套的Canvas，OverrideSorting属性会打断射线，，可以降低层级遍历的成本
## UI字体
- 避免字体框重叠，造成合批打断
- 字体网格重建
	UIText组件发生变化时
	父级对象发生变化时
	UI组件或其父对象enable/disable时

- 动态字体与字体图集
	- 运行时，根据UIText组件内容，动态生成字体图集，只会保存当前Actived状态的UIText控件中的字符
	- 不同的字体库维护不同的Texture图集
	- 字体Size、大小写、粗体、斜体等各种风格都会保存在不同的字体图集中（有无必要，影响图集利用效率，一些利用不多的特殊字体可以采用图片代替或使用Custom Font,Font Assets Creater创建静态字体资源)
	- 当前Font Texture不包含UIText需要显示的字体时，当前Font Texture需要重建
	- 如果当前图集太小，系统也会尝试重建，并加入需要使用的字形，文字图集只增不减
	- 利用Font.RequestCharacterlnTexture可以有效降低启动时间
## UI控件优化注意事项
- 不需要交互的Ui元素一定要关闭Raycast Target选项
- 如果是较大的背景图的UI元素建议也要使用Sprite的九宫格拉伸处理，充分减小UISprite大小，提高Ul Atlas图集利用率
- 对于不可见的UI元素，一定不要使用材质的透明度控制显隐，因为那样UI网格依然在绘制，也不要采用active/deactiveUi控件进行显隐，因为那样会带来gc和重建开销
- 使用全屏的UI界面时，要注意隐藏其背后的所有内容，给GPU休息机会。
- 在使用非全屏但模态对话框时，建议使用OnDemandRendering接口，对渲染进行
- 降频。
- 优化裁剪UI Shader，根据实际使用需求移除多余特性关键字。
### 滚动视图ScrollView
- 使用RectMask2d组件裁剪，通过模版缓冲剔除不必要的渲染
- 使用基于位置的对象池作为实例化缓存。 对渲染位置制作内存池

# 物理
![](/images/performance/编辑器创建资源优化.png)
同时在Time设置中 可以设置用于更新物理的 FixUpdate 间隔，但间隔大了以后，对于高速对象会遇到穿透的问题。此时有两种解决方案
1. 利用射线作为高速子弹的碰撞检测
2. 使用两个渲染帧的位置做出一个 bounding box，用这个bounding box 去与物体做碰撞检测
## Collider优化
### Trigger与Collider
- Trigger对象的碰撞会被物理引l擎所忽略，通过OnTriggerEnter/Stay/Exit函数回调
- Collider对象由物理引擎触发碰撞，通过OnCollisionEnter/Stay/Exit函数回调
- Trigger对象不需要RigidBody组件，Collider对象必须至少有一个Collider对象有RigidBody组件
- Trigger对象更高效
### Unity中的物理组件Collider部分的优化
- 尽量少使用MeshCollider，可以用简单Collider代替，即使用多个简单 Collider 组合代替也要比复杂的MeshCollider来的高效
- MeshCollider是基于三角形面的碰撞
- MeshCollider生成的碰撞体网格占用内存也较高
- MeshCollider即使要用也要尽量保障其是静态物体
- 可以通过PlayerSetting选项中勾选Prebake Collision Meshes选项来在构建应用时预先Bake出碰撞网格。
## Unity中的物理组件RigidBody部分的优化
- Kinematic对象不受物理引擎中力的影响，但可以对其他RigidBody施加物理影响。
- RigidBody完全由物理引l擎模拟来控制，场景中RigidBody数量越多，物理计算负载越高
- 勾选了Kinematic选项的RigidBody对象会被认为是Kinematic的，不会增加场景中的RigidBody个数
- 场景中的RigidBody对象越少越好
## Unity中的RayCast与Overlap部分的优化
- Unity物理中RayCast与Overlap都有NoAlloc版本的函数，在代码中调用时尽量用NoAlloc版本，这样可以避免不必要的GC开销
- 尽量调用RayCast与Overlap时要指定对象图层进行对象过滤，并且RayCast要还可以指定距离来减少一些太远的对象查询
- 此外如果是大量的RayCast操作还可以通过RaycastCommand的方式批量处理，充分利用JobSystem来分摊到多核多线程计算。

# 动画
![](/images/performance/编辑器创建资源优化-1.png)
## 一些细节
- 播放单个AnimationClip速度，Legacy Animation系统更快，因为老系统是直接采样曲线并直接写入对象Transform
- 针对动画的缩放曲线比位移、旋转矩阵开销更大
- 常数曲线不会每帧写入场景，更高效
## Animator
### 更新流程
![](/images/performance/编辑器创建资源优化-2.png)
### 一些细节
- 不要使用字符串来查询Animator
- 使用曲线标记来处理动画事件
- 使用TargetMarching函数来协助处理动画
- 将Animator的CullingMode设置成Based On Renderers来优化动画，并禁用SkinMesh Renderer的UpdateWhen Offscreen属性来让角色不可见时动画不更新
## Animator VS Animation
- Animation可以将任何对象属性制作成Animation Clip，Animator是将AnimaitonClip组织到状态机流程图中使用
- Animation与Animator播放动画时的效率是有个临界点的，这个临界点是根据动画曲线条数来的，当动画曲线条数小于这个临界点时Animation快，当动画曲线条数大于这个临界点时Animator快
- 当Cpu核数较少时，Animation播放动画有优势，当Cpu核数较多时，Animator表现会更好
- Animator Controller Graph中的所有动画节点的AnimationClip都会载入到内存中当有海量动画状态机节点时，内存开销较大
## Playable API
Playable APl是以一套树形结构来组织数据源，并允许用户通过脚本来创建和播放自定义的行为，支持与动画系统、音频系统等其他系统交互，是一套通用的接口。
![](/images/performance/编辑器创建资源优化-3.png)
https://github.com/UnityTech/graph-visualizer 工具

### 优点
- 支持动态动画混合，可为场景中的对象提供自己的动画，并可以动态添加到PlayableGraph当中使用
- 允许创建播放单个动画，而并不会产生创建和管理AnimatorController资源所涉及的开销，可更加灵活的控制PlayableGraph的数据流，可以插入自定义的Aimationjob。
- 可以控制动画文件加载策略，按需加载、异步加载等
- 允许用户动态创建混合图，并直接逐帧控制混合权重（甚至可以混合AniationClip与AnimatorController动画）
- 可以运行时动态创建，根据条件添加可播放节点。而不需要提前提供一套PlayableGraph运行时启动和禁用节点，可以做到自由度更高的override机制
- 可加载自定义配置数据，更加方便的和其他游戏系统整合

### 缺点
- 没有直接使用Animator直观
- 混合模式没有现成的，需要自己实现
- 需要开发更多的配套工具
- 有一定学习成本
## 解决方案选择
- 一些简单、少量曲线动画可以使用Animation或动画区间库如Dotween\iTween等完成，如Ui动画，Transform动画等。
- 角色骨骼蒙皮动画如果骨骼较少，AnimationClip资源不多，对动画混合表现要求不高的项目可以采用LegacyAnimation。注意控制总体曲线数量
- 一些角色动画要求与逻辑有较高的交互、并且动画资源不多的项目可以直接用AnimatorGraph完成
- 一些动作游戏，对动画混合要求较高、有一些高级动画效果要求、动画资源量庞大的项目，建议采用Animator+PlayableAPi扩展Timeline的方式完成。
# 其他
https://www.bilibili.com/video/BV1eA4y1Q7X7?vd_source=87d6628a2e72b87e7260cc3fdba77a81
## CPU工作图
![](/images/performance/编辑器创建资源优化-5.png)
## GPU工作图
![](/images/performance/编辑器创建资源优化-4.png)

## 性能瓶颈可能的情况
瓶颈可能性按由高到低的顺序排列（Metaverse大神 个人经验总结）
- CPU利用率
- 带宽利用率
- CPU/GPU强制同步
- 片元着色器指令
- 几何图形到CPU到GPU的传输
- 纹理CPU到GPU的传输
- 顶点着色器指令
- 几何图形复杂性
