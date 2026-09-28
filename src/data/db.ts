import { MenuItem } from '../types';

export const MENU_ITEMS: MenuItem[] = [
  // Tea & Kehwa
  { id: 't1', name: 'Zafrani Chai', category: 'Tea & Kehwa', description: 'Rich saffron infused tea', price: 400, image: 'https://images.unsplash.com/photo-1594631252845-29fc4586c56f?q=80&w=800' },
  { id: 't2', name: 'Matka Chai', category: 'Tea & Kehwa', description: 'Traditional clay pot tea', price: 220, image: 'https://images.unsplash.com/photo-1544331092-23f05f4e69b5?q=80&w=800' },
  { id: 't3', name: 'Matka Gurr Chai', category: 'Tea & Kehwa', description: 'Jaggery sweetened clay pot tea', price: 240, image: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=800' },
  { id: 't4', name: 'Matka Malai Chai', category: 'Tea & Kehwa', description: 'Creamy clay pot tea', price: 250, image: 'https://images.unsplash.com/photo-1571934811356-5cc5c85023ed?q=80&w=800' },
  { id: 't5', name: 'Matka Gurr Malai Chai', category: 'Tea & Kehwa', description: 'Creamy jaggery clay pot tea', price: 270, image: 'https://images.unsplash.com/photo-1544331092-23f05f4e69b5?q=80&w=800' },
  { id: 't6', name: 'Special Chai', category: 'Tea & Kehwa', description: 'House signature blend', price: 150, image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=800' },
  { id: 't7', name: 'Kashmiri Chai', category: 'Tea & Kehwa', description: 'Pink tea with nuts', price: 240, image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800' },
  { id: 't8', name: 'Chocolate Chai', category: 'Tea & Kehwa', description: 'Tea with cocoa hint', price: 250, image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=800' },
  { id: 't9', name: 'Zafrani Kehwa', category: 'Tea & Kehwa', description: 'Saffron green tea', price: 240, image: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7370?q=80&w=800' },
  { id: 't10', name: 'Peshawari Kahwa', category: 'Tea & Kehwa', description: 'Traditional green tea with cardamom and lemon', price: 180, image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=800' },
  
  // Chat Pata Paratha
  { id: 'p1', name: 'Arabic Paratha', category: 'Chat Pata Paratha', description: 'Special Middle Eastern style', price: 1060, image: 'https://images.unsplash.com/photo-1601050690597-df056fb47091?q=80&w=800' },
  { id: 'p2', name: 'Chicken Paratha', category: 'Chat Pata Paratha', description: 'Stuffed with spiced chicken', price: 790, image: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=800' },
  { id: 'p3', name: 'Chicken Cheese Paratha', category: 'Chat Pata Paratha', description: 'Chicken and melted cheese', price: 340, image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800' },
  { id: 'p4', name: 'Beef Qeema Paratha', category: 'Chat Pata Paratha', description: 'Stuffed with minced beef', price: 460, image: 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?q=80&w=800' },
  { id: 'p5', name: 'Aloo Paratha', category: 'Chat Pata Paratha', description: 'Classic potato stuffing', price: 240, image: 'https://images.unsplash.com/photo-1601050690597-df056fb47091?q=80&w=800' },
  { id: 'p6', name: 'Peshawari Chapli Paratha', category: 'Chat Pata Paratha', description: 'Stuffed with spicy minced meat similar to Chapli Kebab', price: 480, image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=800' },
  
  // Meetha Paratha
  { id: 'm1', name: 'Lacha Paratha', category: 'Meetha Paratha', description: 'Multi-layered flaky bread', price: 110, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?q=80&w=800' },
  { id: 'm2', name: 'Cheese Paratha (Sweet)', category: 'Meetha Paratha', description: 'Sweet cheese filling', price: 280, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=800' },
  { id: 'm3', name: 'Chocolate Paratha', category: 'Meetha Paratha', description: 'Stuffed with chocolate', price: 340, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800' },
  { id: 'm4', name: 'Honey Paratha', category: 'Meetha Paratha', description: 'Drizzled with honey', price: 320, image: 'https://images.unsplash.com/photo-1599307767316-776533bb941c?q=80&w=800' },
  
  // Milk Shakes
  { id: 's1', name: 'Special Khoya Khajor', category: 'Milk Shakes', description: 'Date and khoya blend', price: 420, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800' },
  { id: 's2', name: 'Strawberry Shake', category: 'Milk Shakes', description: 'Fresh strawberry blend', price: 400, image: 'https://images.unsplash.com/photo-1543648965-4d6b57db40bc?q=80&w=800' },
  { id: 's3', name: 'Pina Colada', category: 'Milk Shakes', description: 'Pineapple and coconut', price: 420, image: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?q=80&w=800' },
  { id: 's4', name: 'Mango Shake', category: 'Milk Shakes', description: 'Seasonal mango goodness', price: 380, image: 'https://images.unsplash.com/photo-1471440671318-55bdbb772f93?q=80&w=800' },
  
  // Fresh Juices
  { id: 'j1', name: 'Mint Margarita', category: 'Fresh Juices', description: 'Refreshing lime and mint', price: 280, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800' },
  { id: 'j2', name: 'Apple Juice', category: 'Fresh Juices', description: 'Freshly squeezed apples', price: 400, image: 'https://images.unsplash.com/photo-1563306406-e66174fa3787?q=80&w=800' },
  { id: 'j3', name: 'Falsa Juice', category: 'Fresh Juices', description: 'Tangy local berry juice', price: 350, image: 'https://images.unsplash.com/photo-1471350321752-3093947b4d37?q=80&w=800' },
  { id: 'j4', name: 'Pineapple Mint', category: 'Fresh Juices', description: 'Sweet and zesty', price: 430, image: 'https://images.unsplash.com/photo-1510629954389-c1e0da47d414?q=80&w=800' }
];

export const POETRY_LIST = [
  { id: 'pt1', title: 'The Spirit of Chai', author: 'Nizam', text: 'In each cup, a story of the soil, of the morning mist, and the steam that rises like a prayer.' },
  { id: 'pt2', title: 'Mohabbat ki Chai (Urdu)', author: 'Bashir Badr', text: 'کچھ تو تیرے لبوں کی نرمی ہے، کچھ مری چائے کی گرمی بھی۔۔۔' },
  { id: 'pt3', title: 'The Honor of the Hujra', author: 'Khushal Khan Khattak', text: 'I am the son of a lion, and the world knows my worth; my sword is my pride, and the Hujra is my hearth.' },
  { id: 'pt4', title: 'Pukhtun Spirit (Pashto)', author: 'Ghani Khan', text: 'په یو لاس کې توره په بل کې چای، د پښتون فطرت هم عجیبه دی۔۔۔ (With a sword in one hand and tea in the other, the nature of a Pashtun is truly unique.)' },
  { id: 'pt5', title: 'Mehman Navazi (Urdu)', author: 'Faiz Ahmed Faiz', text: 'آئے ہیں کچھ اس طرح کہ جوں بادل برس کے چلے گئے۔۔۔' },
  { id: 'pt6', title: 'Zindagi aur Chai', author: 'Unknown', text: 'زندگی مختصر ہے، مگر چائے کا کپ لمبا ہونا چاہیے۔' }
];

export const ATTRACTIONS = [
  { id: 'a1', name: 'Live Rubab Performance', description: 'Experience the soul-stirring strings of the traditional North.', distance: 'Every Friday', image: 'https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=1000' },
  { id: 'a2', name: 'Lahore Heritage Night', description: 'A special evening celebrating the fusion of Quetta traditions in the heart of Lahore.', distance: 'Every Sunday', image: 'https://images.unsplash.com/photo-1549413280-9076f7ed8197?q=80&w=1000' },
  { id: 'a3', name: 'Private Hujra Lounge', description: 'Exclusive spaces for traditional family gatherings at our Bahria Town branch.', distance: 'Booking Required', image: 'https://images.unsplash.com/photo-1550966842-8c11e74b3353?q=80&w=1000' }
];

export const HERITAGE_ITEMS = [
  { id: 'h1', title: 'The Rubab', desc: 'The "Lion of Instruments," providing the heartbeat of Pashtun music.', image: 'https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=400' },
  { id: 'h2', title: 'The Samovar', desc: 'A traditional container for boiling tea, a symbol of endless hospitality.', image: 'https://images.unsplash.com/photo-1594631252845-29fc4586c56f?q=80&w=400' },
  { id: 'h3', title: 'Hujra Ethics', desc: 'Centuries-old codes of respect, council, and community bonding.', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=400' }
];

export const HOSPITALITY_PILLARS = [
  { 
    id: 'p1', 
    title: 'Melmastia', 
    desc: 'The sacred law of hospitality. At Quetta Mahfil, every guest is a king, and no one leaves with an empty cup.',
    icon: 'Heart'
  },
  { 
    id: 'p2', 
    title: 'The Open Hujra', 
    desc: 'A tradition of open doors since 1994. Our space is your space, a sanctuary for travelers and neighbors alike.',
    icon: 'DoorOpen'
  },
  { 
    id: 'p3', 
    title: 'Nanawatai', 
    desc: 'The spirit of humble refuge and reconciliation. We offer a place of peace in a busy world.',
    icon: 'ShieldCheck'
  }
];
