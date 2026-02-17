// Echo Worlds — Room Themes
// Each theme defines floor/wall/accent/ambient colours and default furniture.
// Colours are hex strings; objects follow the room-object schema used by the editor.

const themes = {
  default: {
    floorColor: '#1a1a2e',
    wallColor: '#16213e',
    accentColor: '#0f3460',
    ambientColor: '#e2e2e2',
    objects: [
      { type: 'table', x: 300, y: 250, w: 80, h: 48, label: 'Table', collide: true, interact: false },
      { type: 'chair', x: 260, y: 260, w: 32, h: 32, label: 'Chair', collide: true, interact: false },
      { type: 'chair', x: 390, y: 260, w: 32, h: 32, label: 'Chair', collide: true, interact: false },
      { type: 'plant', x: 100, y: 100, w: 32, h: 48, label: 'Plant', collide: false, interact: false },
      { type: 'screen', x: 500, y: 80, w: 64, h: 48, label: 'Screen', collide: true, interact: true, interactionType: 'info', content: 'Welcome to Echo Worlds!' },
    ],
  },

  plaza: {
    floorColor: '#2d2d3f',
    wallColor: '#3b3b5c',
    accentColor: '#7c5cbf',
    ambientColor: '#ffeedd',
    objects: [
      { type: 'fountain', x: 350, y: 300, w: 96, h: 96, label: 'Fountain', collide: true, interact: true, interactionType: 'info', content: 'A serene fountain in the plaza centre.' },
      { type: 'sofa', x: 120, y: 200, w: 80, h: 40, label: 'Bench', collide: true, interact: false },
      { type: 'sofa', x: 560, y: 200, w: 80, h: 40, label: 'Bench', collide: true, interact: false },
      { type: 'screen', x: 400, y: 80, w: 64, h: 48, label: 'Notice Board', collide: true, interact: true, interactionType: 'info', content: 'Community announcements go here.' },
      { type: 'plant', x: 200, y: 400, w: 40, h: 56, label: 'Tree', collide: true, interact: false },
    ],
  },

  arcade: {
    floorColor: '#0d0d1a',
    wallColor: '#1a0a2e',
    accentColor: '#ff00ff',
    ambientColor: '#ff44cc',
    objects: [
      { type: 'arcade-cabinet', x: 100, y: 120, w: 48, h: 64, label: 'Space Invaders', collide: true, interact: true, interactionType: 'info', content: 'Insert coin to play!' },
      { type: 'arcade-cabinet', x: 200, y: 120, w: 48, h: 64, label: 'Pac-Man', collide: true, interact: true, interactionType: 'info', content: 'Waka waka!' },
      { type: 'arcade-cabinet', x: 300, y: 120, w: 48, h: 64, label: 'Tetris', collide: true, interact: true, interactionType: 'info', content: 'Stack \'em up!' },
      { type: 'neon-sign', x: 350, y: 40, w: 96, h: 32, label: 'ARCADE', collide: false, interact: false },
      { type: 'pool-table', x: 500, y: 300, w: 96, h: 56, label: 'Pool Table', collide: true, interact: true, interactionType: 'chat', content: '' },
    ],
  },

  lounge: {
    floorColor: '#1e1e2f',
    wallColor: '#2a1f3d',
    accentColor: '#e67e22',
    ambientColor: '#ffcc88',
    objects: [
      { type: 'sofa', x: 150, y: 250, w: 96, h: 48, label: 'Sofa', collide: true, interact: false },
      { type: 'sofa', x: 350, y: 250, w: 96, h: 48, label: 'Sofa', collide: true, interact: false },
      { type: 'table', x: 260, y: 270, w: 64, h: 40, label: 'Coffee Table', collide: true, interact: false },
      { type: 'bar', x: 500, y: 80, w: 120, h: 40, label: 'Bar', collide: true, interact: true, interactionType: 'shop', content: '/shop/drinks' },
      { type: 'candle', x: 280, y: 260, w: 16, h: 24, label: 'Candle', collide: false, interact: false },
    ],
  },

  gallery: {
    floorColor: '#f5f0e8',
    wallColor: '#e8e0d0',
    accentColor: '#c0392b',
    ambientColor: '#ffffff',
    objects: [
      { type: 'screen', x: 100, y: 80, w: 64, h: 48, label: 'Painting A', collide: true, interact: true, interactionType: 'info', content: 'Abstract Dreams — Artist: Unknown' },
      { type: 'screen', x: 250, y: 80, w: 64, h: 48, label: 'Painting B', collide: true, interact: true, interactionType: 'info', content: 'Digital Sunset — Artist: Nyx' },
      { type: 'screen', x: 400, y: 80, w: 64, h: 48, label: 'Painting C', collide: true, interact: true, interactionType: 'info', content: 'Pixel Forest — Artist: Sage' },
      { type: 'plant', x: 550, y: 150, w: 32, h: 48, label: 'Decorative Fern', collide: false, interact: false },
      { type: 'podium', x: 300, y: 350, w: 48, h: 56, label: 'Guest Book', collide: true, interact: true, interactionType: 'chat', content: '' },
    ],
  },

  campfire: {
    floorColor: '#1a1207',
    wallColor: '#2d1f0e',
    accentColor: '#ff6b35',
    ambientColor: '#ff9944',
    objects: [
      { type: 'candle', x: 350, y: 280, w: 48, h: 48, label: 'Campfire', collide: true, interact: true, interactionType: 'chat', content: '' },
      { type: 'chair', x: 280, y: 250, w: 32, h: 32, label: 'Log Seat', collide: true, interact: false },
      { type: 'chair', x: 420, y: 250, w: 32, h: 32, label: 'Log Seat', collide: true, interact: false },
      { type: 'chair', x: 350, y: 200, w: 32, h: 32, label: 'Log Seat', collide: true, interact: false },
      { type: 'plant', x: 150, y: 150, w: 48, h: 64, label: 'Pine Tree', collide: true, interact: false },
    ],
  },

  townhall: {
    floorColor: '#1c1c2b',
    wallColor: '#28283d',
    accentColor: '#3498db',
    ambientColor: '#aaccff',
    objects: [
      { type: 'podium', x: 350, y: 100, w: 56, h: 64, label: 'Podium', collide: true, interact: true, interactionType: 'info', content: 'Speaker podium' },
      { type: 'stage', x: 250, y: 80, w: 280, h: 96, label: 'Stage', collide: false, interact: false },
      { type: 'chair', x: 200, y: 250, w: 32, h: 32, label: 'Seat', collide: true, interact: false },
      { type: 'chair', x: 300, y: 250, w: 32, h: 32, label: 'Seat', collide: true, interact: false },
      { type: 'chair', x: 400, y: 250, w: 32, h: 32, label: 'Seat', collide: true, interact: false },
      { type: 'chair', x: 500, y: 250, w: 32, h: 32, label: 'Seat', collide: true, interact: false },
      { type: 'screen', x: 350, y: 50, w: 80, h: 32, label: 'Projector Screen', collide: false, interact: true, interactionType: 'info', content: 'Presentation slides' },
    ],
  },

  park: {
    floorColor: '#1a3a1a',
    wallColor: '#2d5a2d',
    accentColor: '#7dcea0',
    ambientColor: '#ddffd0',
    objects: [
      { type: 'fountain', x: 350, y: 250, w: 80, h: 80, label: 'Duck Pond', collide: true, interact: true, interactionType: 'info', content: 'Quack quack!' },
      { type: 'plant', x: 100, y: 100, w: 56, h: 72, label: 'Oak Tree', collide: true, interact: false },
      { type: 'plant', x: 550, y: 100, w: 56, h: 72, label: 'Willow Tree', collide: true, interact: false },
      { type: 'sofa', x: 200, y: 400, w: 80, h: 40, label: 'Park Bench', collide: true, interact: false },
      { type: 'plant', x: 450, y: 350, w: 40, h: 56, label: 'Flower Bed', collide: false, interact: false },
    ],
  },

  lab: {
    floorColor: '#0f1923',
    wallColor: '#182634',
    accentColor: '#00e676',
    ambientColor: '#ccffee',
    objects: [
      { type: 'table', x: 150, y: 150, w: 96, h: 48, label: 'Lab Bench', collide: true, interact: false },
      { type: 'table', x: 400, y: 150, w: 96, h: 48, label: 'Lab Bench', collide: true, interact: false },
      { type: 'screen', x: 300, y: 80, w: 80, h: 48, label: 'Monitor Bank', collide: true, interact: true, interactionType: 'info', content: 'Experiment data readout' },
      { type: 'plant', x: 600, y: 300, w: 32, h: 48, label: 'Specimen Jar', collide: false, interact: true, interactionType: 'info', content: 'Don\'t touch that!' },
      { type: 'bookshelf', x: 50, y: 80, w: 48, h: 96, label: 'Research Papers', collide: true, interact: true, interactionType: 'info', content: 'Stacks of research documents.' },
    ],
  },

  library: {
    floorColor: '#1a1410',
    wallColor: '#2d2418',
    accentColor: '#d4a574',
    ambientColor: '#fff4e0',
    objects: [
      { type: 'bookshelf', x: 80, y: 80, w: 48, h: 120, label: 'Bookshelf A', collide: true, interact: true, interactionType: 'info', content: 'Fiction section' },
      { type: 'bookshelf', x: 180, y: 80, w: 48, h: 120, label: 'Bookshelf B', collide: true, interact: true, interactionType: 'info', content: 'Science section' },
      { type: 'bookshelf', x: 280, y: 80, w: 48, h: 120, label: 'Bookshelf C', collide: true, interact: true, interactionType: 'info', content: 'History section' },
      { type: 'table', x: 450, y: 250, w: 80, h: 48, label: 'Reading Table', collide: true, interact: false },
      { type: 'candle', x: 480, y: 240, w: 16, h: 24, label: 'Reading Lamp', collide: false, interact: false },
    ],
  },

  bazaar: {
    floorColor: '#2a1a0a',
    wallColor: '#3d2a14',
    accentColor: '#f1c40f',
    ambientColor: '#ffeeaa',
    objects: [
      { type: 'table', x: 100, y: 150, w: 80, h: 48, label: 'Spice Stall', collide: true, interact: true, interactionType: 'shop', content: '/shop/spices' },
      { type: 'table', x: 300, y: 150, w: 80, h: 48, label: 'Textile Stall', collide: true, interact: true, interactionType: 'shop', content: '/shop/textiles' },
      { type: 'table', x: 500, y: 150, w: 80, h: 48, label: 'Jewellery Stall', collide: true, interact: true, interactionType: 'shop', content: '/shop/jewellery' },
      { type: 'neon-sign', x: 300, y: 40, w: 120, h: 32, label: 'BAZAAR', collide: false, interact: false },
      { type: 'plant', x: 650, y: 200, w: 40, h: 56, label: 'Palm', collide: false, interact: false },
    ],
  },

  underground: {
    floorColor: '#0a0a0f',
    wallColor: '#141420',
    accentColor: '#9b59b6',
    ambientColor: '#bb88ff',
    objects: [
      { type: 'dj-booth', x: 300, y: 80, w: 96, h: 56, label: 'DJ Booth', collide: true, interact: true, interactionType: 'info', content: 'Now playing: Bass Drop — DJ Echo' },
      { type: 'neon-sign', x: 250, y: 30, w: 128, h: 32, label: 'UNDERGROUND', collide: false, interact: false },
      { type: 'bar', x: 550, y: 100, w: 120, h: 40, label: 'Bar', collide: true, interact: true, interactionType: 'shop', content: '/shop/drinks' },
      { type: 'sofa', x: 100, y: 350, w: 80, h: 40, label: 'VIP Couch', collide: true, interact: false },
      { type: 'candle', x: 120, y: 340, w: 16, h: 24, label: 'Glow Stick', collide: false, interact: false },
    ],
  },

  'space-station': {
    floorColor: '#05050f',
    wallColor: '#0a0a1e',
    accentColor: '#00d4ff',
    ambientColor: '#88eeff',
    objects: [
      { type: 'screen', x: 300, y: 80, w: 96, h: 56, label: 'Command Console', collide: true, interact: true, interactionType: 'info', content: 'Station status: All systems nominal.' },
      { type: 'table', x: 150, y: 250, w: 80, h: 48, label: 'Mess Table', collide: true, interact: false },
      { type: 'chair', x: 120, y: 260, w: 32, h: 32, label: 'Seat', collide: true, interact: false },
      { type: 'screen', x: 500, y: 80, w: 64, h: 48, label: 'Viewport', collide: true, interact: true, interactionType: 'info', content: 'A breathtaking view of Earth.' },
      { type: 'wall', x: 350, y: 200, w: 16, h: 120, label: 'Bulkhead', collide: true, interact: false },
    ],
  },
};

export default themes;
