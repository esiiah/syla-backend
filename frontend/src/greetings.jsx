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
  return `Happy ${days[new Date().getDay()]}!`;
};

export const getCasualGreeting = () => {
  const phrases = [
    "Welcome back",
    "How’s your day going?",
    "Hope you’re doing well!",
    "Ready to crush today?",
    "Let’s make it a productive day!"
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export const createHeroGreeting = (userName) => {
  const timeGreeting = getTimeGreeting();
  const casual = getCasualGreeting();
  const dayGreeting = getDayGreeting();

  return `${timeGreeting}, ${userName}! ${casual} ${dayGreeting}`;
};
