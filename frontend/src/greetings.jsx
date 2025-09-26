// frontend/src/greetings.jsx

export const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  else if (hour >= 12 && hour < 17) return "Good afternoon";
  else if (hour >= 17 && hour < 21) return "Good evening";
  else return "Hello";
};

export const getDayGreeting = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `Happy ${days[new Date().getDay()]}`;
};

export const getCasualGreeting = () => {
  // Short casual greetings
  const phrases = [
    "Welcome back",
    "How are you doing today?",
    "Good to see you",
    "What's New?",
    "How’s your day going?",
    "Hope you’re doing well!",
    "Ready to crush today?",
    "Let’s make it a productive day!"    
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// This chooses which greeting to show based on priority
export const createHeroGreeting = (userName) => {
  const now = new Date();
  const hour = now.getHours();

  // Prioritize greetings
  if (hour >= 5 && hour < 12) return `Good morning, ${userName}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${userName}`;
  if (hour >= 17 && hour < 21) return `Good evening, ${userName}`;

  // Weekend/day-specific greeting as fallback
  if (hour >= 21 || hour < 5) return `${getDayGreeting()}, ${userName}`;

  // fallback casual greeting
  return `${getCasualGreeting()} ${userName}`;
};
