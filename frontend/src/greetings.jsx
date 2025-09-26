// frontend/src/greetings.jsx

export const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

export const getTimeGreeting = (period) => {
  if (period === "morning") return "Good morning";
  if (period === "afternoon") return "Good afternoon";
  if (period === "evening") return "Good evening";
  return "Hello";
};

export const getDayGreeting = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `Happy ${days[new Date().getDay()]}`;
};

export const getCasualGreeting = () => {
  const phrases = [
    "Welcome back",
    "How are you doing today?",
    "Good to see you",
    "What's new?",
    "How’s your day going?",
    "Hope you’re doing well!",
    "Ready to crush today?",
    "Let’s make it a productive day!"
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export const createHeroGreeting = (userName) => {
  const period = getTimePeriod();
  const lastPeriod = localStorage.getItem("lastGreetingPeriod");

  let greeting;

  // If it's a new time period → show time greeting first
  if (lastPeriod !== period) {
    greeting = `${getTimeGreeting(period)}, ${userName}`;
    localStorage.setItem("lastGreetingPeriod", period);
  } else {
    // Otherwise → show casual greeting
    greeting = `${getCasualGreeting()} ${userName}`;
  }

  return greeting;
};
