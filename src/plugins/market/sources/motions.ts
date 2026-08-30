/**
 * 动效目录:animate.css v4 与 hover.css v2 精选(v1 ~60 项)。
 * cls 为库内动画类名(不含 animate__animated 基类,由视图按 lib 组装);
 * 库 css 经 /__market/proxy 拉取注入 <style>,类名真实性由 T6 冒烟对 pinned CDN 校验。
 */
export interface MotionEntry {
  id: string;
  name: string;
  desc: string;
  cls: string;
  lib: 'animate.css' | 'hover.css';
}

export const MOTIONS: MotionEntry[] = [
  // ---- animate.css:attention seekers 吸睛 ----
  { id: 'animate-bounce', name: '弹跳', desc: '上下弹跳,常用于引导注意', cls: 'animate__bounce', lib: 'animate.css' },
  { id: 'animate-flash', name: '闪烁', desc: '透明度快速闪烁', cls: 'animate__flash', lib: 'animate.css' },
  { id: 'animate-pulse', name: '脉冲', desc: '缩放呼吸,常用于加载与直播状态', cls: 'animate__pulse', lib: 'animate.css' },
  { id: 'animate-rubberband', name: '橡皮筋', desc: '弹性拉伸,强调趣味反馈', cls: 'animate__rubberBand', lib: 'animate.css' },
  { id: 'animate-shakex', name: '横向抖动', desc: '左右抖动,常用于错误提示', cls: 'animate__shakeX', lib: 'animate.css' },
  { id: 'animate-shakey', name: '纵向抖动', desc: '上下抖动,表单校验反馈', cls: 'animate__shakeY', lib: 'animate.css' },
  { id: 'animate-headshake', name: '摇头', desc: '绕纵轴小幅摆头', cls: 'animate__headShake', lib: 'animate.css' },
  { id: 'animate-swing', name: '摆动', desc: '顶部悬挂式左右摆动', cls: 'animate__swing', lib: 'animate.css' },
  { id: 'animate-tada', name: '欢呼', desc: '缩放加旋转的组合强调', cls: 'animate__tada', lib: 'animate.css' },
  { id: 'animate-wobble', name: '摇晃', desc: '大幅左右摇晃', cls: 'animate__wobble', lib: 'animate.css' },
  { id: 'animate-jello', name: '果冻', desc: '倾斜加缩放的果冻感', cls: 'animate__jello', lib: 'animate.css' },
  { id: 'animate-heartbeat', name: '心跳', desc: '双击式心跳缩放', cls: 'animate__heartBeat', lib: 'animate.css' },

  // ---- animate.css:入场 ----
  { id: 'animate-flipinx', name: '翻转入场 X', desc: '绕 X 轴翻转入场', cls: 'animate__flipInX', lib: 'animate.css' },
  { id: 'animate-flipiny', name: '翻转入场 Y', desc: '绕 Y 轴翻转入场', cls: 'animate__flipInY', lib: 'animate.css' },
  { id: 'animate-fadein', name: '淡入', desc: '透明度渐入', cls: 'animate__fadeIn', lib: 'animate.css' },
  { id: 'animate-fadeindown', name: '淡入下移', desc: '自上而下淡入', cls: 'animate__fadeInDown', lib: 'animate.css' },
  { id: 'animate-fadeinleft', name: '淡入右移', desc: '自左向右淡入', cls: 'animate__fadeInLeft', lib: 'animate.css' },
  { id: 'animate-fadeinright', name: '淡入左移', desc: '自右向左淡入', cls: 'animate__fadeInRight', lib: 'animate.css' },
  { id: 'animate-fadeinup', name: '淡入上移', desc: '自下而上淡入,卡片列表常用', cls: 'animate__fadeInUp', lib: 'animate.css' },
  { id: 'animate-fadeinupbig', name: '大幅淡入上移', desc: '大距离自下而上淡入', cls: 'animate__fadeInUpBig', lib: 'animate.css' },
  { id: 'animate-zoomin', name: '放大入场', desc: '由小放大淡入', cls: 'animate__zoomIn', lib: 'animate.css' },
  { id: 'animate-zoomindown', name: '放大入场(下)', desc: '自上而下放大入场', cls: 'animate__zoomInDown', lib: 'animate.css' },
  { id: 'animate-slideindown', name: '滑入(下)', desc: '自上滑入,通知条常用', cls: 'animate__slideInDown', lib: 'animate.css' },
  { id: 'animate-slideinleft', name: '滑入(左)', desc: '自左滑入,侧栏抽屉常用', cls: 'animate__slideInLeft', lib: 'animate.css' },
  { id: 'animate-slideinright', name: '滑入(右)', desc: '自右滑入,侧栏抽屉常用', cls: 'animate__slideInRight', lib: 'animate.css' },
  { id: 'animate-slideinup', name: '滑入(上)', desc: '自下滑入,底部弹层常用', cls: 'animate__slideInUp', lib: 'animate.css' },
  { id: 'animate-backindown', name: '回弹入场(下)', desc: '带回弹曲线自上而下入场', cls: 'animate__backInDown', lib: 'animate.css' },
  { id: 'animate-backinleft', name: '回弹入场(左)', desc: '带回弹曲线自左入场', cls: 'animate__backInLeft', lib: 'animate.css' },
  { id: 'animate-backinup', name: '回弹入场(上)', desc: '带回弹曲线自下而上入场', cls: 'animate__backInUp', lib: 'animate.css' },
  { id: 'animate-bouncein', name: '弹跳入场', desc: '弹性弹跳入场', cls: 'animate__bounceIn', lib: 'animate.css' },
  { id: 'animate-bounceindown', name: '弹跳入场(下)', desc: '自上弹跳入场', cls: 'animate__bounceInDown', lib: 'animate.css' },
  { id: 'animate-bounceinup', name: '弹跳入场(上)', desc: '自下弹跳入场', cls: 'animate__bounceInUp', lib: 'animate.css' },
  { id: 'animate-rotatein', name: '旋转入场', desc: '旋转淡入', cls: 'animate__rotateIn', lib: 'animate.css' },
  { id: 'animate-rotateindownleft', name: '旋转入场(左下)', desc: '自左下角旋转淡入', cls: 'animate__rotateInDownLeft', lib: 'animate.css' },
  { id: 'animate-lightspeedinright', name: '光速入场', desc: '斜切加高速飞入', cls: 'animate__lightSpeedInRight', lib: 'animate.css' },
  { id: 'animate-rollin', name: '滚入', desc: '水平滚转入场', cls: 'animate__rollIn', lib: 'animate.css' },
  { id: 'animate-jackinthebox', name: '跳跳盒', desc: '弹出盒式趣味入场', cls: 'animate__jackInTheBox', lib: 'animate.css' },

  // ---- animate.css:退场 ----
  { id: 'animate-flipoutx', name: '翻转退场 X', desc: '绕 X 轴翻转退场', cls: 'animate__flipOutX', lib: 'animate.css' },
  { id: 'animate-fadeout', name: '淡出', desc: '透明度渐出', cls: 'animate__fadeOut', lib: 'animate.css' },
  { id: 'animate-fadeoutdown', name: '淡出下移', desc: '向下淡出,弹层关闭常用', cls: 'animate__fadeOutDown', lib: 'animate.css' },
  { id: 'animate-zoomout', name: '缩小退场', desc: '缩小淡出', cls: 'animate__zoomOut', lib: 'animate.css' },
  { id: 'animate-slideoutup', name: '滑出(上)', desc: '向上滑出,通知关闭常用', cls: 'animate__slideOutUp', lib: 'animate.css' },
  { id: 'animate-bounceout', name: '弹跳退场', desc: '弹性弹跳退场', cls: 'animate__bounceOut', lib: 'animate.css' },
  { id: 'animate-hinge', name: '铰链', desc: '悬挂摆动坠落,喜剧式退场', cls: 'animate__hinge', lib: 'animate.css' },

  // ---- hover.css:hover 反馈 ----
  { id: 'hover-grow', name: '放大', desc: 'hover 时轻微放大', cls: 'hvr-grow', lib: 'hover.css' },
  { id: 'hover-shrink', name: '缩小', desc: 'hover 时轻微缩小', cls: 'hvr-shrink', lib: 'hover.css' },
  { id: 'hover-pulse', name: '脉冲', desc: 'hover 期间缩放脉冲', cls: 'hvr-pulse', lib: 'hover.css' },
  { id: 'hover-push', name: '推挤', desc: 'hover 时压扁再回弹', cls: 'hvr-push', lib: 'hover.css' },
  { id: 'hover-pop', name: '弹出', desc: 'hover 时弹出放大', cls: 'hvr-pop', lib: 'hover.css' },
  { id: 'hover-bounce-in', name: '弹入', desc: 'hover 时弹性放大', cls: 'hvr-bounce-in', lib: 'hover.css' },
  { id: 'hover-bounce-out', name: '弹出', desc: 'hover 时弹性缩小', cls: 'hvr-bounce-out', lib: 'hover.css' },
  { id: 'hover-rotate', name: '旋转', desc: 'hover 时旋转 4 度', cls: 'hvr-rotate', lib: 'hover.css' },
  { id: 'hover-grow-rotate', name: '放大旋转', desc: 'hover 时放大并旋转', cls: 'hvr-grow-rotate', lib: 'hover.css' },
  { id: 'hover-float', name: '上浮', desc: 'hover 时上浮,按钮常用', cls: 'hvr-float', lib: 'hover.css' },
  { id: 'hover-sink', name: '下沉', desc: 'hover 时下沉按压感', cls: 'hvr-sink', lib: 'hover.css' },
  { id: 'hover-bob', name: '浮动', desc: 'hover 期间持续上下浮动', cls: 'hvr-bob', lib: 'hover.css' },
  { id: 'hover-hang', name: '悬挂', desc: 'hover 期间悬挂摆动', cls: 'hvr-hang', lib: 'hover.css' },
  { id: 'hover-skew', name: '斜切', desc: 'hover 时斜切变形', cls: 'hvr-skew', lib: 'hover.css' },
  { id: 'hover-wobble-horizontal', name: '横向摇摆', desc: 'hover 时水平摇摆', cls: 'hvr-wobble-horizontal', lib: 'hover.css' },
  { id: 'hover-wobble-vertical', name: '纵向摇摆', desc: 'hover 时垂直摇摆', cls: 'hvr-wobble-vertical', lib: 'hover.css' },
  { id: 'hover-buzz', name: '震动', desc: 'hover 时小幅高频震动', cls: 'hvr-buzz', lib: 'hover.css' },
  { id: 'hover-sweep-to-right', name: '背景右扫', desc: '背景色自左向右扫过', cls: 'hvr-sweep-to-right', lib: 'hover.css' },
  { id: 'hover-bounce-to-right', name: '弹性右填', desc: '背景弹性填满(向右)', cls: 'hvr-bounce-to-right', lib: 'hover.css' },
  { id: 'hover-radial-out', name: '径向扩散', desc: '背景自中心圆形扩散', cls: 'hvr-radial-out', lib: 'hover.css' },
  { id: 'hover-underline-from-left', name: '下划线滑入', desc: '下划线自左滑入', cls: 'hvr-underline-from-left', lib: 'hover.css' },
  { id: 'hover-glow', name: '发光', desc: 'hover 时外发光', cls: 'hvr-glow', lib: 'hover.css' },
  { id: 'hover-shadow', name: '阴影', desc: 'hover 时出现投影', cls: 'hvr-shadow', lib: 'hover.css' },
  { id: 'hover-grow-shadow', name: '放大投影', desc: 'hover 时放大并投影', cls: 'hvr-grow-shadow', lib: 'hover.css' },
  { id: 'hover-float-shadow', name: '上浮投影', desc: 'hover 时上浮并投影', cls: 'hvr-float-shadow', lib: 'hover.css' },
];
