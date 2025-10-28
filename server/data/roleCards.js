/**
 * Карты ролей - ПРАВИЛЬНАЯ ЛОГИКА
 * Бармен, Целитель, Дилер, DJ получают ЗАПРОСЫ в свои задания
 */

module.exports = {
  bartender: [
    { id: 101, name: "🍺 Налить себе", action: "serve_self", target: "self" },
    { id: 102, name: "🍺 Налить игроку", action: "serve_other", target: "other" },
    { id: 103, name: "🍺 Налить всем", action: "serve_all", target: "all" }
  ],
  
  healer: [],
  dealer: [],
  dj: []
};
