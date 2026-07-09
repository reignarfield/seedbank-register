// Tydie Cleaning's price list, transcribed from tydiecleaning.com/#pricing
// and simplified for display: prices only, inclusions trimmed to short
// bullet points, "quote required" items kept as-is rather than guessed at.
// Update here if prices change - this is the single source the public
// Pricing page renders from.

export const MINIMUM_SERVICE_FEE = 70;

export const PRICE_GROUPS = [
  {
    title: "Window Cleaning",
    items: [
      { name: "Standard apartment / unit", price: "$70" },
      { name: "Standard townhouse", price: "$150" },
      { name: "Standard 3 bedroom house", price: "$250" },
      { name: "Standard 4 bedroom house", price: "$300" },
    ],
  },
  {
    title: "Pressure Cleaning",
    items: [
      { name: "Small driveway", price: "$150" },
      { name: "Pathways", price: "$5 / m²" },
      { name: "Fences / walls", price: "$5 / m²" },
      { name: "Balconies", price: "Quote required" },
    ],
  },
  {
    title: "Solar Panel Cleaning",
    items: [{ name: "20 panels", price: "$150" }],
  },
  {
    title: "Car Cleaning",
    note: "In & Out wash includes outside wash/wax/detail/dry/tyre shine/rim clean, plus an inside essential clean. Deep clean adds engine bay, carpets and seats, and every panel gap.",
    items: [
      { name: "Small car (sedan / hatch)", price: "$120", extra: "+$50 deep clean" },
      { name: "Medium car (SUV)", price: "$150", extra: "+$70 deep clean" },
      { name: "Large car (ute / van / big SUV)", price: "$170", extra: "+$80 deep clean" },
    ],
  },
  {
    title: "House / Office Cleaning",
    note: "Includes a windows spot check, mirrors, vacuum and mop, wiped surfaces, bathroom, kitchen sink and benches, inside fridge, dusting, and bins. Fans, full window cleans, shutters, vents, and carpets are extra.",
    items: [
      { name: "Standard 1-2 bedroom unit", price: "$170" },
      { name: "Standard 3-4 bedroom house", price: "$350" },
    ],
  },
  {
    title: "Bond Cleans",
    note: "A full top-to-bottom clean - every room, every drawer and cupboard, spot-cleaned carpets, windows. Can take a full day to a full week, so it's quoted in person.",
    items: [{ name: "Bond clean", price: "Quote required" }],
  },
  {
    title: "Add-ons",
    items: [
      { name: "Cobweb removal", price: "Quote required" },
      { name: "Bin cleaning", price: "$10 / bin" },
      { name: "Pool fences", price: "$80 / 12 panels" },
      { name: "Tracks (vacuum)", price: "$40-$100 / house" },
      { name: "Balustrades", price: "$50 / 10 panels" },
      { name: "Signage", price: "$5-$10" },
      { name: "Louvres", price: "$1 each / $10 for 12" },
      { name: "Mirrors / closet mirrors", price: "$3-$7" },
      { name: "Fly screens", price: "$5-$7" },
      { name: "French style windows", price: "$10 / 12 panels" },
      { name: "Frame and seal polish", price: "$5-$10 / frame" },
      { name: "Plantation shutters", price: "$10-$20 / set" },
      { name: "Ceiling fan", price: "$15 / fan" },
      { name: "Air conditioning unit", price: "$80" },
    ],
  },
];
