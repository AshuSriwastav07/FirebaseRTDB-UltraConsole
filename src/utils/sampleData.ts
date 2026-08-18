export const SAMPLE_DATASETS = {
  textbook_db: {
    project: "Interactive Physics & Science Textbook",
    version: "2.4.0",
    grade_level: "Grade 11",
    author: "Dr. Evelyn Reed",
    chapters: [
      {
        id: "ch_01",
        title: "Kinematics and Dynamics",
        pages: 45,
        topics: ["Vector Mathematics", "Newtonian Laws", "Frictional Forces"],
        questions: [
          {
            qid: "q_101",
            type: "multiple_choice",
            prompt: "What is the SI unit of force?",
            options: ["Joule", "Newton", "Watt", "Pascal"],
            answer: "Newton"
          },
          {
            qid: "q_102",
            type: "numerical",
            prompt: "Calculate acceleration when m = 5kg and F = 20N (m/s^2)",
            answer: 4.0
          }
        ]
      },
      {
        id: "ch_02",
        title: "Thermodynamics & Energy",
        pages: 38,
        topics: ["Heat Transfer", "Enthalpy", "Entropy"],
        questions: [
          {
            qid: "q_201",
            type: "true_false",
            prompt: "Energy cannot be created or destroyed in an isolated system.",
            answer: true
          }
        ]
      }
    ]
  },

  demo_db: {
    project: "Firebase RTDB UltraConsole",
    status: "active",
    version: "1.0.0",
    settings: {
      theme: "dark",
      auto_sync: true,
      max_connections: 100
    },
    users: {
      "usr_1001": {
        name: "Alex Johnson",
        email: "alex@example.com",
        role: "administrator",
        active: true
      },
      "usr_1002": {
        name: "Sam Taylor",
        email: "sam@example.com",
        role: "developer",
        active: true
      }
    }
  },

  ecommerce: {
    store_info: { name: "ShopMatrix Megastore", version: "3.2.0", currency: "USD" },
    users: {
      "usr_1001": { name: "Eleanor Vance", email: "eleanor@example.com", role: "admin", verified: true, age: 28 },
      "usr_1002": { name: "Marcus Aurelius", email: "marcus@example.org", role: "customer", verified: false, age: 42 }
    },
    products: [
      { id: "prod_01", title: "CyberDeck Horizon Pro", price: 1299.99, in_stock: true, quantity: 42 },
      { id: "prod_02", title: "Ergonomic Mesh Gaming Chair", price: 349.5, in_stock: true, quantity: 15 }
    ]
  },

  gaming: {
    game_title: "Nebula Odyssey Online",
    server_status: { online: true, region: "us-east-1", connected_players: 8421 },
    leaderboard: [
      { rank: 1, username: "VortexRider", score: 99450, class: "CyberNinja" },
      { rank: 2, username: "Solaris_99", score: 94200, class: "StarMage" }
    ]
  },

  social_media: {
    platform: "Nexus Social Network",
    stats: { active_users: 1420500, daily_posts: 89000 },
    trending_hashtags: ["#Tech2026", "#FirebaseUltraConsole", "#ReactJS", "#TypeScript"],
    featured_users: [
      { id: "u1", handle: "@alex_dev", name: "Alex Rivers", followers: 45200 },
      { id: "u2", handle: "@sarah_code", name: "Sarah Chen", followers: 89100 }
    ]
  },

  smart_home: {
    hub_info: { device: "SmartHub Pro 4K", firmware: "v2.1.0-build4", ip: "192.168.1.100" },
    rooms: {
      living_room: { temperature_celsius: 22.5, lights_on: true, thermostat_mode: "cool" },
      bedroom: { temperature_celsius: 21.0, lights_on: false, blinds_closed: true }
    },
    security: { status: "armed_home", motion_detected: false, cameras_active: 4 }
  },

  fintech: {
    bank_name: "Apex Global Capital",
    account: { id: "ACC-984210", currency: "USD", total_balance: 148520.45 },
    transactions: [
      { id: "tx_01", merchant: "Cloud Hosting Inc.", amount: -149.99, type: "debit", status: "completed" },
      { id: "tx_02", merchant: "Client Invoice Payment", amount: 4500.00, type: "credit", status: "completed" }
    ]
  },

  simple: {
    project: "Firebase RTDB Offline Test",
    version: 1,
    status: "active",
    offline_mode: true
  }
};
