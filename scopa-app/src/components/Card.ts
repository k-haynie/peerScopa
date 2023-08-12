export interface CardProps {
  card_id: number;
  value: number;
  points: number;
  suite: string;
}

export function Card(id: number){
  const card_id = id;
  const value = id%10 === 0 ? 10 : id%10;
  const points = value;
  const suite = assignSuite(id);

  return {card_id, value, points, suite}
}

function assignSuite(id: number){
  if (0 < id && id <= 10) // hearts
    return "H";
  else if (10 < id && id <= 20)  // diamonds
    return "D";
  else if (20 < id && id <= 30)  // spades
    return "S";
  else if (30 < id && id <= 40)  // clubs
    return "C";
  else
    return "-"; // invalid input
}