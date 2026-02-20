import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'classic' | 'creative';
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  display: ${p => p.isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
`;

const ModalContent = styled.div`
  background: var(--surface-color);
  backdrop-filter: blur(16px);
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 60px rgba(99, 102, 241, 0.15);
  position: relative;

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 95vh;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
`;

const CloseBtn = styled.button`
  background: var(--surface-highlight);
  border: none;
  color: var(--text-secondary);
  width: 36px; height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s;
  &:hover { background: var(--surface-border); color: var(--text-primary); }
`;

const TabRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 16px 24px 0;
  flex-shrink: 0;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 0;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? 'var(--primary-color)' : 'var(--surface-border)'};
  background: ${p => p.$active ? 'rgba(99,102,241,0.15)' : 'transparent'};
  color: ${p => p.$active ? 'var(--primary-color)' : 'var(--text-secondary)'};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(99,102,241,0.1); }
`;

const SliderArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
`;

const SlideTrack = styled.div<{ $offset: number }>`
  display: flex;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateX(${p => p.$offset}px);
  height: 100%;
`;

const Slide = styled.div`
  min-width: 100%;
  height: 100%;
  min-height: 0;
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`;

const SlideVisual = styled.div`
  width: 100%;
  min-height: 200px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  position: relative;
`;

const SlideTitle = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8px;
`;

const SlideDesc = styled.div`
  font-size: 0.88rem;
  color: var(--text-primary);
  opacity: 0.8;
  line-height: 1.6;
  text-align: center;
  max-width: 400px;
`;

const NavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 24px 20px;
  flex-shrink: 0;
`;

const Dot = styled.div<{ $active: boolean }>`
  width: ${p => p.$active ? '20px' : '6px'};
  height: 6px;
  border-radius: 3px;
  background: ${p => p.$active ? '#6366f1' : 'var(--surface-border)'};
  transition: all 0.3s ease;
  cursor: pointer;
`;

const NavBtn = styled.button<{ $disabled?: boolean }>`
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  color: ${p => p.$disabled ? 'var(--text-muted)' : 'var(--text-secondary)'};
  width: 36px; height: 36px;
  border-radius: 50%;
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
  &:hover { ${p => !p.$disabled && 'background: var(--surface-border); color: var(--text-primary);'} }
`;

// ===================== 图文幻灯片内容 =====================

const BoardDiagram = styled.div`
  display: grid;
  gap: 2px;
  background: var(--surface-highlight);
  border-radius: 8px;
  padding: 8px;
`;

const Cell = styled.div<{ $bg?: string; $border?: string; $glow?: string }>`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 3px;
  background: ${p => p.$bg || 'var(--surface-border)'};
  border: 1px solid ${p => p.$border || 'var(--surface-highlight)'};
  ${p => p.$glow && `box-shadow: 0 0 6px ${p.$glow};`}
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; color: var(--text-muted);
`;

const Legend = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const LegendDot = styled.div<{ $bg: string }>`
  width: 10px; height: 10px;
  border-radius: 2px;
  background: ${p => p.$bg};
`;

const TileCard = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${p => p.$bg};
  border: 1px solid ${p => p.$border};
  width: 100%;
  max-width: 360px;
`;

const TileIcon = styled.div<{ $color: string; $solid?: boolean }>`
  width: 32px; height: 32px;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900;
  font-size: ${p => p.$solid ? '16px' : '13px'};
  color: ${p => p.$color};
  background: ${p => p.$solid ? 'rgba(55,55,60,0.95)' : 'transparent'};
  border: ${p => p.$solid ? '2px solid #4b5563' : 'none'};
  flex-shrink: 0;
`;

const TileText = styled.div`
  flex: 1;
`;

const TileName = styled.div<{ $color: string }>`
  font-weight: 700;
  font-size: 0.88rem;
  color: ${p => p.$color};
`;

const TileDesc = styled.div`
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
`;

// ===================== 图表组件 =====================

const StartCornerDiagram: React.FC = () => {
  const size = 7;
  const corners = [
    { r: 0, c: 0, color: '#f87171' },
    { r: 0, c: size - 1, color: '#fbbf24' },
    { r: size - 1, c: 0, color: '#60a5fa' },
    { r: size - 1, c: size - 1, color: '#4ade80' },
  ];
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <BoardDiagram style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: '70%', maxWidth: 200 }}>
        {Array.from({ length: size * size }).map((_, i) => {
          const r = Math.floor(i / size), c = i % size;
          const corner = corners.find(cr => cr.r === r && cr.c === c);
          return (
            <Cell key={i}
              $bg={corner ? corner.color : undefined}
              $glow={corner ? corner.color : undefined}
            >
              {corner && '★'}
            </Cell>
          );
        })}
      </BoardDiagram>
      <Legend>
        {corners.map((c, i) => (
          <LegendItem key={i}><LegendDot $bg={c.color} />{['P1', 'P2', 'P3', 'P4'][i]}</LegendItem>
        ))}
      </Legend>
    </div>
  );
};

const DiagExample = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
`;

const DiagLabel = styled.div<{ $ok: boolean }>`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${p => p.$ok ? '#4ade80' : '#f87171'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Arrow = styled.div`
  font-size: 1.2rem;
  color: var(--text-muted);
  line-height: 1;
`;

const DiagonalDiagram: React.FC = () => {
  const renderMiniBoard = (
    cells: { r: number; c: number; type: 'old' | 'new' | 'link' }[],
    size: number,
    ok: boolean,
  ) => (
    <BoardDiagram style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: '100%', maxWidth: 130 }}>
      {Array.from({ length: size * size }).map((_, i) => {
        const r = Math.floor(i / size), c = i % size;
        const cell = cells.find(cl => cl.r === r && cl.c === c);
        if (!cell) return <Cell key={i} />;
        if (cell.type === 'old') return <Cell key={i} $bg="#60a5fa" $border="#60a5fa" />;
        if (cell.type === 'link') return (
          <Cell key={i}
            $bg={ok ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}
            $border={ok ? '#4ade80' : '#f87171'}
            $glow={ok ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}
          >
            {ok ? '↗' : '→'}
          </Cell>
        );
        if (cell.type === 'new') return <Cell key={i} $bg={ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'} $border={ok ? '#4ade80' : '#f87171'} />;
        return <Cell key={i} />;
      })}
    </BoardDiagram>
  );

  // ✓ 正确：旧块(0,0)(0,1)(1,0)，新块(1,2)(2,2)(2,3)
  // (1,2)与(0,1)对角✓，无边相邻
  const okCells = [
    { r: 0, c: 0, type: 'old' as const }, { r: 0, c: 1, type: 'old' as const },
    { r: 1, c: 0, type: 'old' as const },
    { r: 1, c: 2, type: 'new' as const },
    { r: 2, c: 2, type: 'new' as const }, { r: 2, c: 3, type: 'new' as const },
  ];

  // ✗ 错误：旧块(0,0)(0,1)(1,0)，新块(1,1)(1,2)(2,1)
  // (1,1)与(0,1)和(1,0)边相邻✗
  const badCells = [
    { r: 0, c: 0, type: 'old' as const }, { r: 0, c: 1, type: 'old' as const },
    { r: 1, c: 0, type: 'old' as const },
    { r: 1, c: 1, type: 'new' as const }, { r: 1, c: 2, type: 'new' as const },
    { r: 2, c: 1, type: 'new' as const },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', width: '100%', maxWidth: 340 }}>
        <DiagExample>
          <DiagLabel $ok={true}>✓ 对角相连</DiagLabel>
          {renderMiniBoard(okCells, 5, true)}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            新块仅在对角接触旧块
          </div>
        </DiagExample>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Arrow>│</Arrow>
        </div>

        <DiagExample>
          <DiagLabel $ok={false}>✗ 边缘相邻</DiagLabel>
          {renderMiniBoard(badCells, 5, false)}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            新块与旧块边挨边（禁止）
          </div>
        </DiagExample>
      </div>
      <Legend>
        <LegendItem><LegendDot $bg="#60a5fa" />已放置</LegendItem>
        <LegendItem><LegendDot $bg="rgba(74,222,128,0.35)" />合法新块</LegendItem>
        <LegendItem><LegendDot $bg="rgba(248,113,113,0.35)" />非法新块</LegendItem>
      </Legend>
    </div>
  );
};

const PiecesDiagram: React.FC = () => {
  const pieces = [
    { shape: [[1]], label: '1' },
    { shape: [[1,1]], label: '2' },
    { shape: [[1,1,1]], label: '3' },
    { shape: [[1,1],[1,0]], label: '3' },
    { shape: [[1,1,1,1]], label: '4' },
    { shape: [[1,1],[1,1]], label: '4' },
    { shape: [[1,1,1],[0,1,0]], label: '4' },
    { shape: [[1,1,1,1,1]], label: '5' },
    { shape: [[1,1,1],[1,0,0],[1,0,0]], label: '5' },
    { shape: [[1,1,0],[0,1,1],[0,0,1]], label: '5' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' }}>
      {pieces.map((p, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: `repeat(${p.shape[0].length}, 16px)`, gap: 1 }}>
          {p.shape.flat().map((v, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: 2,
              background: v ? '#6366f1' : 'transparent',
              border: v ? '1px solid #818cf8' : 'none',
            }} />
          ))}
        </div>
      ))}
    </div>
  );
};

const KbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 7px',
  borderRadius: 5,
  background: 'var(--surface-color)',
  border: '1px solid var(--surface-border)',
  fontFamily: 'monospace',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  lineHeight: 1.6,
};

const ControlsDiagram: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: '100%' }}>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>🖱️ 鼠标 / 👆 触屏</div>
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--surface-highlight)',
      border: '1px solid var(--surface-border)',
    }}>
      {[
        { label: '选择拼图', desc: '点击底部拼图库中的拼图块' },
        { label: '放置拼图', desc: '点击棋盘目标位置，或拖拽到目标位置松手' },
        { label: '右键旋转', desc: '鼠标右键点击棋盘可快速旋转' },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.84rem' }}>
          <span style={{ color: 'var(--primary-color)', fontWeight: 600, minWidth: 64, flexShrink: 0 }}>{item.label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{item.desc}</span>
        </div>
      ))}
    </div>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 2 }}>⌨️ 键盘快捷键</div>
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--surface-highlight)',
      border: '1px solid var(--surface-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
        <span style={KbdStyle}>→</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>或底部</span>
        <span style={{ fontSize: '1rem' }}>⟳</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>按钮</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontWeight: 500 }}>旋转 90°</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
        <span style={KbdStyle}>Shift</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>或底部</span>
        <span style={{ fontSize: '1rem' }}>↔</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>按钮</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontWeight: 500 }}>水平翻转</span>
      </div>
    </div>
  </div>
);

const SpecialTilesVisual: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
    <TileCard $bg="var(--tile-gold-bg)" $border="var(--tile-gold-border)">
      <TileIcon $color="var(--tile-gold-text)">★</TileIcon>
      <TileText>
        <TileName $color="var(--tile-gold-text)">金色方格</TileName>
        <TileDesc>纯正面效果：加分、翻倍、护盾、额外回合</TileDesc>
      </TileText>
    </TileCard>
    <TileCard $bg="var(--tile-purple-bg)" $border="var(--tile-purple-border)">
      <TileIcon $color="var(--tile-purple-text)">?</TileIcon>
      <TileText>
        <TileName $color="var(--tile-purple-text)">紫色方格</TileName>
        <TileDesc>随机效果：可能加分也可能扣分，充满惊喜</TileDesc>
      </TileText>
    </TileCard>
    <TileCard $bg="var(--tile-red-bg)" $border="var(--tile-red-border)">
      <TileIcon $color="var(--tile-red-text)">!</TileIcon>
      <TileText>
        <TileName $color="var(--tile-red-text)">红色方格</TileName>
        <TileDesc>代价换道具：扣分但获得强力道具卡</TileDesc>
      </TileText>
    </TileCard>
    <TileCard $bg="var(--tile-barrier-bg)" $border="var(--tile-barrier-border)">
      <TileIcon $color="var(--tile-barrier-text)" $solid>×</TileIcon>
      <TileText>
        <TileName $color="var(--tile-barrier-text)">障碍方格</TileName>
        <TileDesc>无法覆盖，放置时需绕开</TileDesc>
      </TileText>
    </TileCard>
  </div>
);

const ItemCardsVisual: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 380 }}>
    {[
      { icon: '🌀', name: '黑洞', desc: '回收对手最近放置的棋子' },
      { icon: '🔮', name: '诅咒', desc: '给对手施加负面状态效果' },
      { icon: '🛡️', name: '钢铁', desc: '免疫负面效果2回合' },
      { icon: '❄️', name: '冰冻', desc: '跳过对手下一回合' },
      { icon: '💰', name: '掠夺', desc: '偷取对手部分分数' },
    ].map((card, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8,
        background: 'var(--surface-highlight)',
        border: '1px solid var(--surface-border)',
      }}>
        <span style={{ fontSize: '1.1rem' }}>{card.icon}</span>
        <span style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.85rem', minWidth: 40 }}>{card.name}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{card.desc}</span>
      </div>
    ))}
  </div>
);

// ===================== 主组件 =====================

interface SlideData {
  visual: React.ReactNode;
  title: string;
  desc: string;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose, mode = 'classic' }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'classic' | 'creative'>(mode);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);
  const touchDeltaY = useRef(0);

  useEffect(() => {
    if (isOpen) { setActiveTab(mode); setCurrentSlide(0); }
  }, [isOpen, mode]);

  useEffect(() => { setCurrentSlide(0); }, [activeTab]);

  const classicSlides: SlideData[] = [
    {
      visual: <StartCornerDiagram />,
      title: t('help.slideCornerTitle') || '起始位置',
      desc: t('help.slideCornerDesc') || '每位玩家从棋盘的一个角落开始，第一块必须覆盖角落格子',
    },
    {
      visual: <DiagonalDiagram />,
      title: t('help.slideDiagTitle') || '对角连接',
      desc: t('help.slideDiagDesc') || '新块必须与己方已有块的对角相连，但不能与己方块的边相邻',
    },
    {
      visual: <PiecesDiagram />,
      title: t('help.slidePiecesTitle') || '拼图块',
      desc: t('help.slidePiecesDesc') || '每人21块，从1格到5格不等，可旋转和翻转。放置越多得分越高',
    },
    {
      visual: <ControlsDiagram />,
      title: t('help.slideControlsTitle') || '操作方式',
      desc: t('help.slideControlsDesc') || '从拼图库选择拼图块后，点击或拖拽到棋盘放置；键盘 → 旋转，Shift 翻转',
    },
  ];

  const creativeSlides: SlideData[] = [
    {
      visual: <SpecialTilesVisual />,
      title: t('help.slideSpecialTitle') || '特殊方格',
      desc: t('help.slideSpecialDesc') || '棋盘上随机分布特殊方格，覆盖时触发效果',
    },
    {
      visual: <ItemCardsVisual />,
      title: t('help.slideItemsTitle') || '道具卡',
      desc: t('help.slideItemsDesc') || '踩红色方格获得道具卡，回合开始有30秒使用窗口',
    },
  ];

  const slides = activeTab === 'classic' ? classicSlides : creativeSlides;
  const slideCount = slides.length;

  const goTo = useCallback((idx: number) => {
    setCurrentSlide(Math.max(0, Math.min(idx, slideCount - 1)));
  }, [slideCount]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDelta.current = 0;
    touchDeltaY.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };
  const handleTouchEnd = () => {
    const horizontalSwipe = Math.abs(touchDelta.current) > 50 && Math.abs(touchDelta.current) > Math.abs(touchDeltaY.current);
    if (horizontalSwipe && touchDelta.current > 0) goTo(currentSlide - 1);
    else if (horizontalSwipe && touchDelta.current < 0) goTo(currentSlide + 1);
    touchDelta.current = 0;
    touchDeltaY.current = 0;
  };

  const sliderWidth = sliderRef.current?.clientWidth || 0;

  return (
    <ModalOverlay isOpen={isOpen} onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalContent>
        <Header>
          <Title>{t('help.title')}</Title>
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </Header>

        <TabRow>
          <TabBtn $active={activeTab === 'classic'} onClick={() => setActiveTab('classic')}>
            {t('help.classicTab') || '经典模式'}
          </TabBtn>
          <TabBtn $active={activeTab === 'creative'} onClick={() => setActiveTab('creative')}>
            {t('help.creativeTab') || '创意模式'}
          </TabBtn>
        </TabRow>

        <SliderArea
          ref={sliderRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <SlideTrack $offset={-currentSlide * sliderWidth}>
            {slides.map((slide, idx) => (
              <Slide key={`${activeTab}-${idx}`}>
                <SlideVisual>{slide.visual}</SlideVisual>
                <SlideTitle>{slide.title}</SlideTitle>
                <SlideDesc>{slide.desc}</SlideDesc>
              </Slide>
            ))}
          </SlideTrack>
        </SliderArea>

        <NavRow>
          <NavBtn $disabled={currentSlide === 0} onClick={() => goTo(currentSlide - 1)}>‹</NavBtn>
          {slides.map((_, i) => (
            <Dot key={i} $active={i === currentSlide} onClick={() => goTo(i)} />
          ))}
          <NavBtn $disabled={currentSlide === slideCount - 1} onClick={() => goTo(currentSlide + 1)}>›</NavBtn>
        </NavRow>
      </ModalContent>
    </ModalOverlay>
  );
};

export default GameRulesModal;
