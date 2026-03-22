// Extended SEO data including categories, URLs, and site structure

export const SEO_CATEGORIES = ['All', 'Waxing', 'Nails', 'Tanning', 'Hair', 'Skincare', 'Equipment'];

export const SEO_KEYWORDS_EXTENDED = [
  // Waxing
  { id: 1, keyword: 'wax strips australia', position: 3, prev: 5, volume: 2400, url: '/waxing/wax-strips/', category: 'Waxing', trend: 'up' },
  { id: 2, keyword: 'wax cartridges wholesale', position: 7, prev: 12, volume: 1800, url: '/waxing/wax-cartridges/', category: 'Waxing', trend: 'up' },
  { id: 3, keyword: 'roll on wax kit', position: 4, prev: 4, volume: 1200, url: '/waxing/roll-on-wax/', category: 'Waxing', trend: 'flat' },
  { id: 4, keyword: 'hard wax beads bulk', position: 9, prev: 14, volume: 880, url: '/waxing/hard-wax-beads/', category: 'Waxing', trend: 'up' },
  { id: 5, keyword: 'waxing supplies australia', position: 2, prev: 3, volume: 3200, url: '/waxing/', category: 'Waxing', trend: 'up' },
  { id: 6, keyword: 'how to do a brazilian wax', position: 6, prev: 8, volume: 5400, url: '/blog/how-to-brazilian-wax/', category: 'Waxing', trend: 'up' },
  { id: 7, keyword: 'waxing pre post care products', position: 14, prev: 18, volume: 720, url: '/waxing/pre-post-care/', category: 'Waxing', trend: 'up' },
  { id: 8, keyword: 'salon wax heater', position: 11, prev: 9, volume: 960, url: '/waxing/wax-heaters/', category: 'Waxing', trend: 'down' },
  // Nails
  { id: 9, keyword: 'nail salon supplies wholesale', position: 3, prev: 3, volume: 2900, url: '/nails/', category: 'Nails', trend: 'flat' },
  { id: 10, keyword: 'gel nail polish australia', position: 5, prev: 8, volume: 4200, url: '/nails/gel-polish/', category: 'Nails', trend: 'up' },
  { id: 11, keyword: 'acrylic nail kit professional', position: 8, prev: 11, volume: 1600, url: '/nails/acrylic-kits/', category: 'Nails', trend: 'up' },
  { id: 12, keyword: 'nail lamp uv led', position: 6, prev: 6, volume: 2100, url: '/nails/nail-lamps/', category: 'Nails', trend: 'flat' },
  { id: 13, keyword: 'nail tips bulk buy', position: 12, prev: 16, volume: 780, url: '/nails/nail-tips/', category: 'Nails', trend: 'up' },
  { id: 14, keyword: 'nail drill bits set', position: 17, prev: 22, volume: 1100, url: '/nails/nail-drills/', category: 'Nails', trend: 'up' },
  { id: 15, keyword: 'how to do gel nails at home', position: 4, prev: 7, volume: 8800, url: '/blog/gel-nails-at-home/', category: 'Nails', trend: 'up' },
  // Tanning
  { id: 16, keyword: 'spray tan solution australia', position: 4, prev: 6, volume: 2600, url: '/tanning/spray-tan/', category: 'Tanning', trend: 'up' },
  { id: 17, keyword: 'tanning bed supplies', position: 9, prev: 13, volume: 1400, url: '/tanning/tanning-beds/', category: 'Tanning', trend: 'up' },
  { id: 18, keyword: 'self tan wholesale', position: 6, prev: 7, volume: 1900, url: '/tanning/self-tan/', category: 'Tanning', trend: 'up' },
  { id: 19, keyword: 'airbrush tanning machine', position: 13, prev: 19, volume: 920, url: '/tanning/machines/', category: 'Tanning', trend: 'up' },
  { id: 20, keyword: 'how long does spray tan last', position: 2, prev: 3, volume: 6600, url: '/blog/spray-tan-duration/', category: 'Tanning', trend: 'up' },
  // Hair
  { id: 21, keyword: 'salon supplies australia', position: 4, prev: 7, volume: 1900, url: '/', category: 'Hair', trend: 'up' },
  { id: 22, keyword: 'hair salon supplies', position: 2, prev: 5, volume: 3200, url: '/hair/', category: 'Hair', trend: 'up' },
  { id: 23, keyword: 'professional hair colour australia', position: 7, prev: 9, volume: 2800, url: '/hair/colour/', category: 'Hair', trend: 'up' },
  { id: 24, keyword: 'hair extensions wholesale', position: 11, prev: 11, volume: 1700, url: '/hair/extensions/', category: 'Hair', trend: 'flat' },
  { id: 25, keyword: 'salon shampoo bulk buy', position: 5, prev: 8, volume: 1400, url: '/hair/shampoo-conditioner/', category: 'Hair', trend: 'up' },
  // Skincare
  { id: 26, keyword: 'professional skincare wholesale', position: 8, prev: 12, volume: 1600, url: '/skincare/', category: 'Skincare', trend: 'up' },
  { id: 27, keyword: 'facial treatment products', position: 6, prev: 8, volume: 2200, url: '/skincare/facials/', category: 'Skincare', trend: 'up' },
  { id: 28, keyword: 'microdermabrasion supplies', position: 14, prev: 18, volume: 880, url: '/skincare/microdermabrasion/', category: 'Skincare', trend: 'up' },
  // Equipment
  { id: 29, keyword: 'salon furniture australia', position: 11, prev: 15, volume: 590, url: '/equipment/furniture/', category: 'Equipment', trend: 'up' },
  { id: 30, keyword: 'beauty salon equipment wholesale', position: 6, prev: 9, volume: 1200, url: '/equipment/', category: 'Equipment', trend: 'up' },
];

export const SEO_TREND_DATA = {
  '7d': [
    { label: 'Mon', current: 5.2, previous: 6.8 },
    { label: 'Tue', current: 4.9, previous: 6.5 },
    { label: 'Wed', current: 5.1, previous: 6.2 },
    { label: 'Thu', current: 4.7, previous: 6.0 },
    { label: 'Fri', current: 4.8, previous: 5.8 },
    { label: 'Sat', current: 4.5, previous: 5.6 },
    { label: 'Sun', current: 4.9, previous: 5.9 },
  ],
  '30d': [
    { label: 'Oct 1', current: 7.2, previous: 9.1 },
    { label: 'Oct 8', current: 6.8, previous: 8.7 },
    { label: 'Oct 15', current: 6.4, previous: 8.3 },
    { label: 'Oct 22', current: 6.0, previous: 7.9 },
    { label: 'Oct 29', current: 5.7, previous: 7.5 },
    { label: 'Nov 5', current: 5.4, previous: 7.2 },
    { label: 'Nov 12', current: 5.1, previous: 6.8 },
    { label: 'Nov 19', current: 4.9, previous: 6.4 },
    { label: 'Nov 26', current: 4.9, previous: 6.1 },
  ],
  '90d': [
    { label: 'Sep', current: 9.2, previous: 11.4 },
    { label: 'Oct', current: 8.1, previous: 10.2 },
    { label: 'Nov', current: 7.4, previous: 9.6 },
    { label: 'Dec', current: 6.8, previous: 8.9 },
    { label: 'Jan', current: 6.1, previous: 8.1 },
    { label: 'Feb', current: 5.6, previous: 7.4 },
    { label: 'Mar', current: 4.9, previous: 6.8 },
  ],
  '12m': [
    { label: 'Apr', current: 13.1, previous: 15.2 },
    { label: 'May', current: 12.4, previous: 14.6 },
    { label: 'Jun', current: 11.8, previous: 13.9 },
    { label: 'Jul', current: 11.2, previous: 13.1 },
    { label: 'Aug', current: 10.4, previous: 12.3 },
    { label: 'Sep', current: 9.2, previous: 11.4 },
    { label: 'Oct', current: 8.1, previous: 10.2 },
    { label: 'Nov', current: 7.4, previous: 9.6 },
    { label: 'Dec', current: 6.8, previous: 8.9 },
    { label: 'Jan', current: 6.1, previous: 8.1 },
    { label: 'Feb', current: 5.6, previous: 7.4 },
    { label: 'Mar', current: 4.9, previous: 6.8 },
  ],
};

export const KPI_COMPARE = {
  current: { avgPos: 4.9, clicks: 3842, impressions: 48200, ctr: 7.97 },
  previous: { avgPos: 6.8, clicks: 2910, impressions: 38400, ctr: 6.82 },
};

// Site Structure for the visualiser
export const SITE_STRUCTURE_NODES = [
  // Root
  { id: 'home', label: 'Home', url: '/', type: 'home', status: 'live', position: 4, traffic: 1240, clicks: 89, silo: null, parent: null, workingOn: false },
  // Silos
  { id: 'silo-waxing', label: 'Silo: Waxing', url: '/waxing/', type: 'silo', status: 'live', position: 2, traffic: 890, clicks: 64, silo: 'Waxing', parent: 'home', workingOn: true },
  { id: 'silo-nails', label: 'Silo: Nails', url: '/nails/', type: 'silo', status: 'live', position: 3, traffic: 720, clicks: 52, silo: 'Nails', parent: 'home', workingOn: false },
  { id: 'silo-tanning', label: 'Silo: Tanning', url: '/tanning/', type: 'silo', status: 'live', position: 6, traffic: 480, clicks: 34, silo: 'Tanning', parent: 'home', workingOn: false },
  { id: 'silo-hair', label: 'Silo: Hair', url: '/hair/', type: 'silo', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Hair', parent: 'home', workingOn: false },
  { id: 'silo-skincare', label: 'Silo: Skincare', url: '/skincare/', type: 'silo', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Skincare', parent: 'home', workingOn: false },
  // Waxing categories
  { id: 'cat-wax-strips', label: 'Wax Strips', url: '/waxing/wax-strips/', type: 'category', status: 'live', position: 3, traffic: 340, clicks: 28, silo: 'Waxing', parent: 'silo-waxing', workingOn: true },
  { id: 'cat-wax-cartridges', label: 'Wax Cartridges', url: '/waxing/wax-cartridges/', type: 'category', status: 'live', position: 7, traffic: 210, clicks: 16, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  { id: 'cat-roll-on-wax', label: 'Roll On Wax', url: '/waxing/roll-on-wax/', type: 'category', status: 'live', position: 4, traffic: 180, clicks: 13, silo: 'Waxing', parent: 'silo-waxing', workingOn: true },
  { id: 'cat-hard-wax', label: 'Hard Wax Beads', url: '/waxing/hard-wax-beads/', type: 'category', status: 'live', position: 9, traffic: 120, clicks: 9, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  { id: 'cat-wax-heaters', label: 'Wax Heaters', url: '/waxing/wax-heaters/', type: 'category', status: 'live', position: 11, traffic: 95, clicks: 7, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  { id: 'cat-pre-post', label: 'Pre & Post Care', url: '/waxing/pre-post-care/', type: 'category', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  // Waxing posts
  { id: 'post-brazilian', label: 'How To Brazilian Wax', url: '/blog/how-to-brazilian-wax/', type: 'post', status: 'live', position: 6, traffic: 520, clicks: 41, silo: 'Waxing', parent: 'cat-wax-strips', workingOn: true },
  { id: 'post-wax-types', label: 'Types of Wax Guide', url: '/blog/types-of-wax/', type: 'post', status: 'live', position: 14, traffic: 88, clicks: 6, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  { id: 'post-wax-sensitive', label: 'Waxing Sensitive Skin', url: '/blog/waxing-sensitive-skin/', type: 'post', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Waxing', parent: 'silo-waxing', workingOn: false },
  // Nails categories
  { id: 'cat-gel-polish', label: 'Gel Polish', url: '/nails/gel-polish/', type: 'category', status: 'live', position: 5, traffic: 380, clicks: 29, silo: 'Nails', parent: 'silo-nails', workingOn: false },
  { id: 'cat-acrylic', label: 'Acrylic Kits', url: '/nails/acrylic-kits/', type: 'category', status: 'live', position: 8, traffic: 195, clicks: 15, silo: 'Nails', parent: 'silo-nails', workingOn: false },
  { id: 'cat-nail-lamps', label: 'Nail Lamps', url: '/nails/nail-lamps/', type: 'category', status: 'live', position: 6, traffic: 240, clicks: 18, silo: 'Nails', parent: 'silo-nails', workingOn: false },
  { id: 'post-gel-nails', label: 'Gel Nails At Home', url: '/blog/gel-nails-at-home/', type: 'post', status: 'live', position: 4, traffic: 760, clicks: 58, silo: 'Nails', parent: 'silo-nails', workingOn: false },
  { id: 'cat-nail-tips', label: 'Nail Tips', url: '/nails/nail-tips/', type: 'category', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Nails', parent: 'silo-nails', workingOn: false },
  // Tanning
  { id: 'cat-spray-tan', label: 'Spray Tan Solutions', url: '/tanning/spray-tan/', type: 'category', status: 'live', position: 4, traffic: 290, clicks: 22, silo: 'Tanning', parent: 'silo-tanning', workingOn: false },
  { id: 'post-spray-tan-last', label: 'How Long Does Spray Tan Last', url: '/blog/spray-tan-duration/', type: 'post', status: 'live', position: 2, traffic: 640, clicks: 49, silo: 'Tanning', parent: 'silo-tanning', workingOn: false },
  { id: 'cat-tanning-machines', label: 'Tanning Machines', url: '/tanning/machines/', type: 'category', status: 'planned', position: null, traffic: 0, clicks: 0, silo: 'Tanning', parent: 'silo-tanning', workingOn: false },
];

export const SITE_LINKS = [
  { from: 'home', to: 'silo-waxing', type: 'internal' },
  { from: 'home', to: 'silo-nails', type: 'internal' },
  { from: 'home', to: 'silo-tanning', type: 'internal' },
  { from: 'home', to: 'silo-hair', type: 'internal' },
  { from: 'silo-waxing', to: 'cat-wax-strips', type: 'internal' },
  { from: 'silo-waxing', to: 'cat-wax-cartridges', type: 'internal' },
  { from: 'silo-waxing', to: 'cat-roll-on-wax', type: 'internal' },
  { from: 'silo-waxing', to: 'cat-hard-wax', type: 'internal' },
  { from: 'silo-waxing', to: 'cat-wax-heaters', type: 'internal' },
  { from: 'cat-wax-strips', to: 'post-brazilian', type: 'internal' },
  { from: 'silo-waxing', to: 'post-wax-types', type: 'internal' },
  { from: 'silo-nails', to: 'cat-gel-polish', type: 'internal' },
  { from: 'silo-nails', to: 'cat-acrylic', type: 'internal' },
  { from: 'silo-nails', to: 'cat-nail-lamps', type: 'internal' },
  { from: 'silo-nails', to: 'post-gel-nails', type: 'internal' },
  { from: 'silo-tanning', to: 'cat-spray-tan', type: 'internal' },
  { from: 'silo-tanning', to: 'post-spray-tan-last', type: 'internal' },
  { from: 'cat-wax-heaters', to: 'cat-hard-wax', type: 'broken' },
];
