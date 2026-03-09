---
title: 场景简化
description: 整理远中近景、遮挡、光影与地形的场景简化优化方法。
tags: [unity, performance, scene, lod]
updated: 2025-02-24
---
# 远景简化
## Rendering Debugger工具
![](/images/performance/场景简化总览与远景优化.png)
可以查看整个场景的OverDraw信息 
### 级联阴影
级联阴影

## 如何将远景简化为天空盒
1. 将除了远景之外的先隐藏
2. 在场景中添加反射探针，烘焙CubeMap
3. 设置反射探针的类型为Baked
   ![](/images/performance/场景简化总览与远景优化-1.png)
4. 开启Static选项中的Reflection Probe Static选项
5. 取消 Lighting 设置页面中的 AutoGenerate 复选框 
Q：为何点击烘焙后出现了4个反射探针
A：因为场景中还存在其他反射探针，可以删除其他生成结果或者关闭其他反射探针

# 中景简化
LOD级别最好不要超过5级
也可以采用替代体简化
### 远中近景中都需要出现的物体
设置为四个级别
![](/images/performance/场景简化.png)

### 近中景物体
![](/images/performance/场景简化-1.png)

### 仅近景物体
![](/images/performance/场景简化-2.png)

# 关键点
在现代GPU上，几十万的顶点优化并不会带来显著的性能提升，延时渲染管线下，像素着色器处理与分辨率才是重要瓶颈
实际上是由于不同平台中 Quality的 Level Of Detail 中 LOD Bias 的设置导致。该值越低，相对就更重于细节，原先40%的层级就可能变成60%
优化迭代与判断验证，也是优化中很重要的一点

# 遮挡剔除

遮挡剔除Occlusion Culling


延时渲染下，不透明对象已经做了像素深度检测，剔除被遮挡的像素进入渲染管线。
但在原始渲染下的投影阶段与半透明物体的绘制仍然是前向渲染

需要在应用遮挡剔除的摄像机中应用 Occlusion Culling
![](/images/performance/场景简化-3.png)
Occlusion Culling 对场景中设置为静态的遮挡体和被遮挡体起作用
如果遇到动态遮挡，如门窗时该怎么办，使用 Proto Culling

Portal Culling
对参与遮挡的对象添加 Occlusion Portal组件，根据门窗的实际大小设置入口区域，重新烘焙场景，通过脚本设置入口的遮挡与关闭


# 光影剔除
找到场景中，不再需要的一些投影进行关闭
如 平坦的地形 的自投影、烘焙完成的天空盒光源
## 对光影进行剔除优化
### 使用SRP下的 Light Layers
比较麻烦，需要对相关的资源 进行 LightLayer的设置
### 通过脚本
计算灯光与摄像机的距离控制灯光的开启与关闭
控制室内场景中只有一盏点光源作为室内区域投影的主光源，是否开启投影也是根据摄像机与灯光的距离来判断
```cs
public class LightCulling :MonoBehaviour
{
	[SerializeField]private Gameobject playerCamera;
	[SerializeField] private float shadowCullingDistance =15f;
	[SerializeField] private float lightCullingDistance=30f;
	private Light _light;
	public bool enableShadows = false;
	private void Awake(){
		_light=GetComponent<Light>();
		}
	private void Update()
	{
	//Calculate the distance between a given object andthelight source
	float cameraDistance =Vector3.Distance(playerCamera.transform.position,gameobject.transform.position);
	if(cameraDistance <= shadowCullingDistance && enableShadows)
		_light.shadows = LightShadows.Soft;
	else
		_light.shadows = LightShadows.None;
		
	if (cameraDistance <= lightCullingDistance)
		_light.enabled = true;
	else
		_light.enabled = false;
	}
```
有一定的CPU开销

### 为不同平台设置不同的灯光设置
要合理检查 不同的Shadow Atlas 分辨率与不同的的Resolution Tiers的层级设置，确保额外的灯光投影都能在同一张Atlas中。容不下会有错误提示，请进行修正。
调整Cascade Count 的分级，减少远距离细小投影体的个数，花枝上也没有特别大差异
![](/images/performance/场景简化-4.png)

# 地形优化
Unity中的Terrain 不够轻量，开销往往很大，突出在初始的shader上

## 推荐方案
最好的方式是自己写一套地形烘焙的工具，根据 Terrain data 将Mesh信息和混合后的地形纹理烘焙出来，使用Prefab生成地形块
如插件 Terrain To Mesh

shader使用大量关键字作为材质属性的话，改起来会很麻烦

# 主光源级联阴影优化
将LOD的思想应用到我们的级联阴影上
