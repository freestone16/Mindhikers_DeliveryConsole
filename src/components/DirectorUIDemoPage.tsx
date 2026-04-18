import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  ArrowLeft,
  Bot,
  Camera,
  ChevronRight,
  Clapperboard,
  Film,
  FolderKanban,
  Image,
  Layers3,
  Megaphone,
  Music4,
  NotebookPen,
  ScrollText,
  Sparkles,
  Workflow,
} from 'lucide-react';
import './DirectorUIDemoPage.css';

type DemoModule = {
  id: string;
  name: string;
  shortcut: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
};

type DemoSession = {
  title: string;
  meta: string;
  status: string;
  active?: boolean;
};

type StageId = 'p1' | 'p2' | 'p3' | 'p4';

type DemoFact = {
  label: string;
  value: string;
};

type DemoCard = {
  kicker: string;
  title: string;
  body: string;
};

type DemoItemTag =
  | 'ready'
  | 'synced'
  | 'warm'
  | 'focus'
  | 'selected'
  | 'review'
  | 'running'
  | 'pending'
  | 'done'
  | 'package'
  | 'handoff';

type DemoListItem = {
  name: string;
  desc: string;
  tag: DemoItemTag;
};

type DemoAnchor = {
  title: string;
  desc: string;
  icon: 'project' | 'source' | 'handoff';
};

type DemoCitation = {
  index: string;
  text: string;
  meta: string;
};

type DemoPrinciple = {
  title: string;
  body: string;
  icon: 'concept' | 'workflow' | 'layers';
};

type StageContent = {
  id: StageId;
  screen: string;
  label: string;
  status: string;
  kicker: string;
  title: string;
  lede: string;
  primaryCta: string;
  secondaryCta: string;
  footerCta: string;
  facts: DemoFact[];
  abstractLabel: string;
  abstract: string;
  cardsLabel: string;
  cards: DemoCard[];
  principlesLabel: string;
  principles: DemoPrinciple[];
  rightTitle: string;
  rightSubtitle: string;
  rightListTitle: string;
  rightItems: DemoListItem[];
  anchors: DemoAnchor[];
  citations: DemoCitation[];
};

const modules: DemoModule[] = [
  { id: 'director', name: 'Director', shortcut: '01', icon: Camera, active: true },
  { id: 'shorts', name: 'Shorts', shortcut: '02', icon: Clapperboard },
  { id: 'thumbnail', name: 'Thumbnail', shortcut: '03', icon: Image },
  { id: 'music', name: 'Music', shortcut: '04', icon: Music4 },
  { id: 'marketing', name: 'Marketing', shortcut: '05', icon: Megaphone },
];

const sessions: DemoSession[] = [
  {
    title: '注意力坍塌炼造',
    meta: '概念 v3 · 视觉导演会话 · 7 min',
    status: '当前会话',
    active: true,
  },
  {
    title: '工具主义下的意义重建',
    meta: '概念 v1 · 草稿',
    status: '昨日',
  },
  {
    title: '慢技术与日常秩序',
    meta: '分镜 v2 · 待合并',
    status: '3d',
  },
];

const stages: StageContent[] = [
  {
    id: 'p1',
    screen: '01',
    label: 'P1 概念',
    status: '概念已定向',
    kicker: '概念定向稿',
    title: '碎片时代的专注力回收：一部关于注意力重建的导演方案',
    lede: '从信息洪流退回人的呼吸与秩序。不是把焦虑拍成喧闹，而是把“专注力”重新拍成一件有重量、有节律、可以执行的工程。',
    primaryCta: '确认概念，进入视觉方案',
    secondaryCta: '导入离线 JSON',
    footerCta: '送入 Shorts',
    facts: [
      { label: '项目', value: 'CSET-SP3' },
      { label: '脚本', value: '深度文稿_v2.md' },
      { label: '模型', value: 'claude-sonnet-4-6' },
      { label: '输出', value: '04_Visuals · director' },
    ],
    abstractLabel: 'ABSTRACT',
    abstract:
      '本方案不把“注意力碎片化”表现为纯技术副作用，也不把人物放进赛博霓虹与噪音界面里。它更像一封给现代工作者的导演备忘录：先承认被切碎，再重新建立节奏、空间和动作。画面会围绕桌面、走廊、清晨的自然光、被收拢的通知面板与缓慢推进的镜头来组织，让观众感到“专注”不是心灵鸡汤，而是一套可被实践的秩序。',
    cardsLabel: '阶段预览',
    cards: [
      {
        kicker: 'P1 · CONCEPT',
        title: '概念稿定向',
        body: '把“专注力回收”从抽象问题翻译成可拍、可配乐、可进入分镜的视觉命题。',
      },
      {
        kicker: 'P2 · STORYBOARD',
        title: '镜头方案筛选',
        body: '建立章节骨架、B-roll 类型和镜头密度，让后续生成不失控。',
      },
      {
        kicker: 'P3 · RENDER',
        title: '渲染编排台',
        body: '把字幕、SRT、XML、画面安全区和输出节奏统一到一个执行台。',
      },
    ],
    principlesLabel: '视觉原则',
    principles: [
      {
        icon: 'concept',
        title: '先稳住概念，再推生成',
        body: '视觉母题先被人确认，再交给模型扩张，不让工具抢叙事主导权。',
      },
      {
        icon: 'workflow',
        title: '四阶段清晰可回退',
        body: 'P1 到 P4 都要像一个工作台，不是靠隐藏状态推进的黑箱流程。',
      },
      {
        icon: 'layers',
        title: '深色壳，暖色工作台',
        body: '壳层承载系统感，纸面承载内容感，让阅读与执行各归其位。',
      },
    ],
    rightTitle: 'Artifact',
    rightSubtitle: 'Director Context Drawer',
    rightListTitle: 'LOADED ENGINES',
    rightItems: [
      {
        name: 'Seedance Storyboard · v4',
        desc: '横版镜头预演 / 画面节奏 / 关键视觉母题',
        tag: 'ready',
      },
      {
        name: 'Remotion Layout · v2',
        desc: '字幕安全区 / 构图网格 / 场景排布',
        tag: 'synced',
      },
      {
        name: 'Artlist Match · v1',
        desc: '音乐性格 / 质感锚点 / 情绪落点',
        tag: 'warm',
      },
    ],
    anchors: [
      {
        icon: 'project',
        title: 'Project Context Dock',
        desc: 'CSET-SP3 / 深度文稿_v2.md / 04_Visuals',
      },
      {
        icon: 'source',
        title: 'Concept Source',
        desc: 'Roundtable#a81c → Crucible v3 → Delivery Director',
      },
      {
        icon: 'handoff',
        title: 'Next Handoff',
        desc: 'Shorts storyboard / Distribution queue / render pack',
      },
    ],
    citations: [
      {
        index: '01',
        text: 'Roundtable#a81c 提炼出的核心判断：注意力碎片化不是病症，而是现代通知结构的副产品。',
        meta: 'Roundtable#a81c · 17:33',
      },
      {
        index: '02',
        text: '导演约束：画面不做赛博噪音，不做霓虹信息洪流，要把“回收专注”拍成一场安静但坚定的重建。',
        meta: 'Director brief · 17:37',
      },
      {
        index: '03',
        text: '执行原则：概念先稳住世界观，再进入分镜，不让模型输出直接主导镜头语言。',
        meta: 'OldYang rule · 17:40',
      },
    ],
  },
  {
    id: 'p2',
    screen: '02',
    label: 'P2 视觉方案',
    status: '分镜筛选中',
    kicker: '镜头方案工作台',
    title: '把概念拆成章节、镜头密度与 B-roll 结构',
    lede: '这一阶段不再讨论大命题，而是把抽象概念压缩成章节骨架、画面类型、镜头节奏和可选方案。重点是筛，不是继续发散。',
    primaryCta: '锁定当前方案，进入渲染编排',
    secondaryCta: '返回概念稿修订',
    footerCta: '进入渲染编排',
    facts: [
      { label: '章节', value: '06 个章节' },
      { label: '候选', value: '24 个镜头方案' },
      { label: '过滤', value: 'seedance + remotion' },
      { label: '已勾选', value: '11 / 24' },
    ],
    abstractLabel: 'WORKSPACE',
    abstract:
      'P2 的 UI 重点应该像剪辑台或表格式工作区，而不是继续长篇阅读。用户要能一眼看到“当前章节、候选数量、已选数量、过滤条件、下一步阻塞”。因此中区信息密度要高于 P1，右栏则承接预览、当前选中卡和审阅痕迹。',
    cardsLabel: '当前章节',
    cards: [
      {
        kicker: 'CHAPTER 01',
        title: '桌面与通知流',
        body: '先铺设“被切碎”的环境：桌面提示、未读角标、频繁切换的光源与手部动作。',
      },
      {
        kicker: 'CHAPTER 02',
        title: '暂停与回收',
        body: '镜头开始变长，动作开始减速，通知面板被收拢，人物视线重新回到纸面与窗口。',
      },
      {
        kicker: 'CHAPTER 03',
        title: '秩序重建',
        body: '进入更稳定的构图和更清晰的字幕安全区，为 P3 的渲染编排减压。',
      },
    ],
    principlesLabel: '交互原则',
    principles: [
      {
        icon: 'concept',
        title: '批量筛选优先',
        body: '先看章节和过滤，再钻入单镜头，不让用户在局部细节里迷路。',
      },
      {
        icon: 'workflow',
        title: '右栏承接预览与日志',
        body: '中区只保留筛选与选择，详细预览和运行态放右侧 drawer。',
      },
      {
        icon: 'layers',
        title: '选中态要像编辑器',
        body: '高亮靠深色块、细边框和序号，不靠夸张色面和大胶囊按钮。',
      },
    ],
    rightTitle: 'Shots',
    rightSubtitle: 'Storyboard Review Drawer',
    rightListTitle: 'SHOT STACK',
    rightItems: [
      {
        name: 'Chapter 01 · 桌面开场',
        desc: 'seedance / remotion / 低机位静态 / 已通过',
        tag: 'selected',
      },
      {
        name: 'Chapter 02 · 通知洪流',
        desc: 'seedance / 高频切换 / 仍需收敛噪音',
        tag: 'review',
      },
      {
        name: 'Chapter 03 · 回收动作',
        desc: 'remotion / 纸面特写 / 准备进入 render',
        tag: 'focus',
      },
    ],
    anchors: [
      {
        icon: 'project',
        title: 'Current Filter',
        desc: 'seedance + remotion / 仅看已勾选 / 当前章节 02',
      },
      {
        icon: 'source',
        title: 'Shot Source',
        desc: 'P1 概念母题 → Chapter rail → 当前候选镜头',
      },
      {
        icon: 'handoff',
        title: 'Next Handoff',
        desc: '确认镜头方案 → 送入 P3 渲染编排',
      },
    ],
    citations: [
      {
        index: '01',
        text: '筛选规则：先收口 B-roll 类型，再细看每个镜头，不要让候选方案无限生长。',
        meta: 'P2 rule · 18:12',
      },
      {
        index: '02',
        text: '当前章节焦点：通知洪流段落的噪音需要压低，不要拍成赛博海报。',
        meta: 'Review note · 18:15',
      },
      {
        index: '03',
        text: '通过条件：每个章节至少有一条可执行方案，且字幕安全区不会被构图挤压。',
        meta: 'OldYang gate · 18:20',
      },
    ],
  },
  {
    id: 'p3',
    screen: '03',
    label: 'P3 渲染编排',
    status: '渲染队列运行',
    kicker: '渲染执行台',
    title: '把字幕、安全区、SRT、XML 和输出节奏收进一张执行桌',
    lede: 'P3 的 UI 重点不是美观，而是让人清楚地知道队列在做什么、哪一步卡住、哪些输出还能补救。它更像一张工程台，而不是阅读稿。',
    primaryCta: '开始最终渲染',
    secondaryCta: '返回 P2 调整镜头',
    footerCta: '执行最终渲染',
    facts: [
      { label: '队列', value: '03 个任务' },
      { label: '运行中', value: '02 个 worker' },
      { label: '字幕', value: 'SRT 已挂载' },
      { label: 'XML', value: 'Premiere draft' },
    ],
    abstractLabel: 'RUNTIME',
    abstract:
      'P3 需要把“状态、错误、重试、输出”做得比 P1/P2 更硬。中区应优先展示执行骨架：任务队列、当前节点、输出清单、失败恢复。右栏则显示队列卡、渲染日志和产物预览，避免操作者在多个区块来回找状态。',
    cardsLabel: '执行骨架',
    cards: [
      {
        kicker: 'QUEUE 01',
        title: '字幕安全区校验',
        body: '先检查 16:9 画布、字幕底边距与文本长度，避免进入渲染后才发现画面被遮挡。',
      },
      {
        kicker: 'QUEUE 02',
        title: 'XML / SRT 汇流',
        body: '把 Phase 2 勾选结果和台本节奏统一到可导出的时间线中，保证回到剪辑台仍可读。',
      },
      {
        kicker: 'QUEUE 03',
        title: '最终渲染与回收',
        body: '生成预览、记录失败点、暴露重试按钮，而不是把错误吞掉。',
      },
    ],
    principlesLabel: '执行原则',
    principles: [
      {
        icon: 'concept',
        title: '先暴露状态，再暴露美化',
        body: '用户首先要知道队列在哪一步，哪一个任务失败，错误是否可重试。',
      },
      {
        icon: 'workflow',
        title: '失败要能回退',
        body: 'P3 不是单向黑箱，失败后要能回到 P2 修镜头或在当前节点重跑。',
      },
      {
        icon: 'layers',
        title: '日志进入右栏',
        body: '中区专注执行骨架，详细日志和文件预览放右侧，保证主舞台不碎。',
      },
    ],
    rightTitle: 'Render',
    rightSubtitle: 'Queue / Logs / Outputs',
    rightListTitle: 'RENDER QUEUE',
    rightItems: [
      {
        name: '字幕安全区检查',
        desc: '1920×1080 / bottom safe zone 108px / 已完成',
        tag: 'done',
      },
      {
        name: 'XML 汇流与预览',
        desc: 'premiere-export.xml / 当前节点进行中',
        tag: 'running',
      },
      {
        name: 'Seedance 最终出片',
        desc: '等待 queue slot / 准备串行执行',
        tag: 'pending',
      },
    ],
    anchors: [
      {
        icon: 'project',
        title: 'Runtime Context',
        desc: 'SRT 已加载 / XML 可导出 / 16:9 画布安全区已校验',
      },
      {
        icon: 'source',
        title: 'Render Source',
        desc: 'P2 选中镜头 → SRT / XML → render queue',
      },
      {
        icon: 'handoff',
        title: 'Next Handoff',
        desc: '输出 render pack → 交给 P4 交付确认',
      },
    ],
    citations: [
      {
        index: '01',
        text: '当前阻塞：XML 汇流仍有 1 处时间线锚点待确认，但不影响预览出片。',
        meta: 'Queue log · 19:02',
      },
      {
        index: '02',
        text: '安全规则：字幕安全区固定像素，不能用百分比 paddingBottom 代替。',
        meta: 'Rule #128 · 19:05',
      },
      {
        index: '03',
        text: '重试策略：Seedance 超时阈值至少 300s，不能沿用旧 120s 写死值。',
        meta: 'Rule #87 · 19:08',
      },
    ],
  },
  {
    id: 'p4',
    screen: '04',
    label: 'P4 导出交付',
    status: '交付包待确认',
    kicker: '导出与交付',
    title: '把导演产物整理成交付包，再安全送往 Shorts 与 Distribution',
    lede: 'P4 不再创造内容，而是确认交付物是否完整、命名是否干净、下游 handoff 是否顺畅。这个阶段要像发布前的总检查，而不是又一次自由创作。',
    primaryCta: '确认交付包',
    secondaryCta: '返回 P3 查看输出',
    footerCta: '送入 Distribution',
    facts: [
      { label: '导出包', value: 'render-pack.zip' },
      { label: '视频', value: '01 主成片 + 03 预览' },
      { label: '附带', value: 'XML / SRT / notes' },
      { label: '下游', value: 'Shorts + Queue' },
    ],
    abstractLabel: 'DELIVERY',
    abstract:
      'P4 的 UI 应该让操作者一眼看清“有哪些文件、哪些已确认、哪些仍缺失、下一站去哪里”。因此中区应偏 manifest 和 checklist，右栏则呈现导出物和下游 handoff，而不是继续堆概念文案。',
    cardsLabel: '交付清单',
    cards: [
      {
        kicker: 'PACKAGE 01',
        title: '输出物清点',
        body: '主成片、预览片、XML、SRT、说明 note 都要以清单式暴露，不靠目录猜。',
      },
      {
        kicker: 'PACKAGE 02',
        title: '命名与版本确认',
        body: '统一版本号、命名规则和输出路径，确保下游看到的是稳定的交付包。',
      },
      {
        kicker: 'PACKAGE 03',
        title: 'handoff 去向',
        body: 'Director 的终点不是页面完成，而是顺利进入 Shorts、Distribution 或回退返修。',
      },
    ],
    principlesLabel: '交付原则',
    principles: [
      {
        icon: 'concept',
        title: '先核对文件，再点交付',
        body: '不要把“送入下游”做成无条件按钮，缺项时必须显式暴露。',
      },
      {
        icon: 'workflow',
        title: 'handoff 语义统一',
        body: '所有导出动作都应该有明确目的地：Shorts、Distribution，或回到 Director。',
      },
      {
        icon: 'layers',
        title: 'P4 是检查台',
        body: '界面重心应该落在 manifest、状态、去向，而不是继续长篇阅读。',
      },
    ],
    rightTitle: 'Deliverables',
    rightSubtitle: 'Manifest / Handoff / Review',
    rightListTitle: 'EXPORT PACK',
    rightItems: [
      {
        name: 'render-pack.zip',
        desc: '主成片 + 预览片 + XML + SRT + notes',
        tag: 'package',
      },
      {
        name: 'Shorts handoff draft',
        desc: '已生成 vertical-ready 提纲，等待确认',
        tag: 'handoff',
      },
      {
        name: 'Distribution queue item',
        desc: '标题、版本、交付说明均已预填',
        tag: 'ready',
      },
    ],
    anchors: [
      {
        icon: 'project',
        title: 'Manifest Check',
        desc: '文件完整 / 命名 clean / 交付说明已附带',
      },
      {
        icon: 'source',
        title: 'Package Source',
        desc: 'P3 输出 → render pack → delivery manifest',
      },
      {
        icon: 'handoff',
        title: 'Final Handoff',
        desc: 'Distribution queue / Shorts adaptation / Director rollback',
      },
    ],
    citations: [
      {
        index: '01',
        text: '交付检查：当前导出包已带 XML、SRT、预览 note，可以进入 Queue。',
        meta: 'Manifest log · 19:34',
      },
      {
        index: '02',
        text: '返修条件：若下游发现镜头节奏不稳定，必须回退到 P2，而不是在 P4 临时补救。',
        meta: 'Handoff gate · 19:38',
      },
      {
        index: '03',
        text: '命名纪律：交付物版本号、项目号和模块名要统一，不允许临时手填漂移。',
        meta: 'Rules · 19:40',
      },
    ],
  },
];

const principleIconMap: Record<DemoPrinciple['icon'], ComponentType<{ className?: string }>> = {
  concept: NotebookPen,
  workflow: Workflow,
  layers: Layers3,
};

const anchorIconMap: Record<DemoAnchor['icon'], ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  source: ScrollText,
  handoff: Film,
};

export const DirectorUIDemoPage = () => {
  const [activeStageId, setActiveStageId] = useState<StageId>('p1');
  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? stages[0];

  return (
    <div className="director-demo">
      <header className="director-demo__topbar">
        <div className="director-demo__brand">
          <div className="director-demo__brandmark">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="director-demo__brandcopy">
            <span className="director-demo__product">DeliveryConsole</span>
            <span className="director-demo__version">v0.3 demo</span>
          </div>
        </div>

        <div className="director-demo__crumbs">
          <span>Delivery</span>
          <ChevronRight className="h-4 w-4" />
          <span>Director</span>
          <ChevronRight className="h-4 w-4" />
          <strong>注意力的坍塌炼造</strong>
        </div>

        <div className="director-demo__meta">
          <span>CSET-SP3</span>
          <span>深度文稿_v2.md</span>
          <span>自动存档 17:58</span>
          <span className="director-demo__status">{activeStage.status}</span>
        </div>
      </header>

      <div className="director-demo__shell">
        <aside className="director-demo__left">
          <section className="director-demo__panel">
            <div className="director-demo__panelhead">
              <span>WORKSTATIONS</span>
              <button type="button" aria-label="新增模块">
                +
              </button>
            </div>

            <nav aria-label="Delivery Workstations" className="director-demo__modulelist">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={item.active ? 'director-demo__module director-demo__module--active' : 'director-demo__module'}
                  >
                    <span className="director-demo__modulemain">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </span>
                    <span className="director-demo__shortcut">{item.shortcut}</span>
                  </button>
                );
              })}
              <button type="button" className="director-demo__module director-demo__module--slot">
                + 扩展位
              </button>
            </nav>
          </section>

          <section className="director-demo__panel director-demo__panel--sessions">
            <div className="director-demo__panelhead">
              <span>SESSIONS · DIRECTOR</span>
              <button type="button" aria-label="新增会话">
                +
              </button>
            </div>

            <div className="director-demo__sessionlist">
              {sessions.map((session) => (
                <article
                  key={session.title}
                  className={
                    session.active
                      ? 'director-demo__session director-demo__session--active'
                      : 'director-demo__session'
                  }
                >
                  <div className="director-demo__sessiondot" />
                  <div>
                    <h3>{session.title}</h3>
                    <p>{session.meta}</p>
                  </div>
                  <span>{session.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="director-demo__dock">
            <div className="director-demo__user">
              <div className="director-demo__avatar">L</div>
              <div>
                <strong>LuZhoua</strong>
                <p>mindhikers · founder</p>
              </div>
            </div>

            <div className="director-demo__dockgrid">
              <div>
                <span>当前项目</span>
                <strong>CSET-SP3</strong>
              </div>
              <div>
                <span>当前文稿</span>
                <strong>深度文稿_v2.md</strong>
              </div>
              <div>
                <span>全局模型</span>
                <strong>claude-sonnet-4-6</strong>
              </div>
              <div>
                <span>输出目录</span>
                <strong>04_Visuals</strong>
              </div>
            </div>
          </section>
        </aside>

        <main className="director-demo__center">
          <div className="director-demo__stagebar">
            <button type="button" className="director-demo__backlink">
              <ArrowLeft className="h-4 w-4" />
              返回会话列表
            </button>

            <div className="director-demo__stagepills" aria-label="Director stages">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={
                    stage.id === activeStage.id
                      ? 'director-demo__pill director-demo__pill--active'
                      : 'director-demo__pill'
                  }
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          <article className="director-demo__paper">
            <div className="director-demo__eyebrow">
              <span className="director-demo__eyebrowline" />
              <span>DIRECTOR · MINDHIKERS · ATTENTION REBUILD</span>
            </div>

            <header className="director-demo__paperhead">
              <div>
                <p className="director-demo__paperkicker">{activeStage.kicker}</p>
                <h1>{activeStage.title}</h1>
                <p className="director-demo__lede">{activeStage.lede}</p>
              </div>

              <div className="director-demo__actionrow">
                <button type="button" className="director-demo__ghostbtn">
                  {activeStage.secondaryCta}
                </button>
                <button type="button" className="director-demo__primarybtn director-demo__primarybtn--dark">
                  {activeStage.primaryCta}
                </button>
              </div>
            </header>

            <section className="director-demo__facts">
              {activeStage.facts.map((fact) => (
                <div key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </section>

            <section className="director-demo__abstract">
              <div className="director-demo__sectionlabel">{activeStage.abstractLabel}</div>
              <p>{activeStage.abstract}</p>
            </section>

            <section className="director-demo__cards" aria-label="Director phase workspace">
              {activeStage.cards.map((card) => (
                <article key={card.title} className="director-demo__card">
                  <p>{card.kicker}</p>
                  <h2>{card.title}</h2>
                  <span>{card.body}</span>
                </article>
              ))}
            </section>

            <section className="director-demo__principles">
              <div className="director-demo__sectionlabel">{activeStage.principlesLabel}</div>
              <div className="director-demo__principlegrid">
                {activeStage.principles.map((principle) => {
                  const Icon = principleIconMap[principle.icon];
                  return (
                    <article key={principle.title}>
                      <Icon className="h-4 w-4" />
                      <h3>{principle.title}</h3>
                      <p>{principle.body}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </article>
        </main>

        <aside className="director-demo__right">
          <div className="director-demo__artifacthead">
            <div>
              <strong>{activeStage.rightTitle}</strong>
              <p>{activeStage.rightSubtitle}</p>
            </div>
            <div className="director-demo__screens">
              <span>SCREEN</span>
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={
                    stage.id === activeStage.id
                      ? 'director-demo__screen director-demo__screen--active'
                      : 'director-demo__screen'
                  }
                >
                  {stage.screen}
                </button>
              ))}
            </div>
          </div>

          <section className="director-demo__artifactsection">
            <div className="director-demo__artifacttitle">{activeStage.rightListTitle}</div>
            <div className="director-demo__enginelist">
              {activeStage.rightItems.map((item) => (
                <article key={item.name} className="director-demo__engine">
                  <div className="director-demo__engineicon">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <span className={`director-demo__enginetag director-demo__enginetag--${item.tag}`}>
                    {item.tag}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="director-demo__artifactsection">
            <div className="director-demo__artifacttitle">ANCHORS</div>
            <div className="director-demo__anchorlist">
              {activeStage.anchors.map((anchor) => {
                const Icon = anchorIconMap[anchor.icon];
                return (
                  <article key={anchor.title}>
                    <Icon className="h-4 w-4" />
                    <div>
                      <strong>{anchor.title}</strong>
                      <p>{anchor.desc}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="director-demo__artifactsection director-demo__artifactsection--fill">
            <div className="director-demo__artifacttitle">CITATIONS</div>
            <div className="director-demo__citationlist">
              {activeStage.citations.map((citation) => (
                <article key={citation.index} className="director-demo__citation">
                  <span>[{citation.index}]</span>
                  <div>
                    <p>{citation.text}</p>
                    <small>{citation.meta}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="director-demo__artifactfoot">
            <button type="button" className="director-demo__primarybtn director-demo__primarybtn--full">
              {activeStage.footerCta}
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
};

export default DirectorUIDemoPage;
