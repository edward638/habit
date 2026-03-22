export interface Painting {
  id: string;
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
  // All lowercase strings the guess will be checked against
  acceptedTitles: string[];
}

export const PAINTINGS: Painting[] = [
  {
    id: 'mona-lisa',
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: '1503–1519',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    acceptedTitles: ['mona lisa', 'la gioconda', 'la joconde'],
  },
  {
    id: 'starry-night',
    title: 'The Starry Night',
    artist: 'Vincent van Gogh',
    year: '1889',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    acceptedTitles: ['the starry night', 'starry night'],
  },
  {
    id: 'birth-of-venus',
    title: 'The Birth of Venus',
    artist: 'Sandro Botticelli',
    year: '1484–1486',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg',
    acceptedTitles: ['the birth of venus', 'birth of venus', 'la nascita di venere'],
  },
  {
    id: 'girl-with-pearl-earring',
    title: 'Girl with a Pearl Earring',
    artist: 'Johannes Vermeer',
    year: '1665',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
    acceptedTitles: ['girl with a pearl earring', 'girl with the pearl earring'],
  },
  {
    id: 'the-scream',
    title: 'The Scream',
    artist: 'Edvard Munch',
    year: '1893',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
    acceptedTitles: ['the scream', 'scream'],
  },
  {
    id: 'sunflowers',
    title: 'Sunflowers',
    artist: 'Vincent van Gogh',
    year: '1888',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Vincent_van_Gogh_-_Sunflowers_-_VGM_F458.jpg/800px-Vincent_van_Gogh_-_Sunflowers_-_VGM_F458.jpg',
    acceptedTitles: ['sunflowers', 'van gogh sunflowers'],
  },
  {
    id: 'great-wave',
    title: 'The Great Wave off Kanagawa',
    artist: 'Katsushika Hokusai',
    year: '1831',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg',
    acceptedTitles: ['the great wave off kanagawa', 'the great wave', 'great wave off kanagawa', 'great wave'],
  },
  {
    id: 'water-lilies',
    title: 'Water Lilies',
    artist: 'Claude Monet',
    year: '1906',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg',
    acceptedTitles: ['water lilies', 'nympheas', 'nymphéas'],
  },
  {
    id: 'grande-jatte',
    title: 'A Sunday on La Grande Jatte',
    artist: 'Georges Seurat',
    year: '1886',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/1280px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg',
    acceptedTitles: ['a sunday on la grande jatte', 'sunday on la grande jatte', 'la grande jatte'],
  },
  {
    id: 'american-gothic',
    title: 'American Gothic',
    artist: 'Grant Wood',
    year: '1930',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg/800px-Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg',
    acceptedTitles: ['american gothic'],
  },
  {
    id: 'night-watch',
    title: 'The Night Watch',
    artist: 'Rembrandt van Rijn',
    year: '1642',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Night_Watch_-_HD.jpg/1280px-The_Night_Watch_-_HD.jpg',
    acceptedTitles: ['the night watch', 'night watch', 'de nachtwacht'],
  },
  {
    id: 'last-supper',
    title: 'The Last Supper',
    artist: 'Leonardo da Vinci',
    year: '1495–1498',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C3%9Altima_Cena_-_Da_Vinci_5.jpg/1280px-%C3%9Altima_Cena_-_Da_Vinci_5.jpg',
    acceptedTitles: ['the last supper', 'last supper', 'ultima cena'],
  },
  {
    id: 'liberty-leading',
    title: 'Liberty Leading the People',
    artist: 'Eugène Delacroix',
    year: '1830',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg/1280px-Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg',
    acceptedTitles: ['liberty leading the people', 'la liberté guidant le peuple'],
  },
  {
    id: 'creation-of-adam',
    title: 'The Creation of Adam',
    artist: 'Michelangelo',
    year: '1512',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    acceptedTitles: ['the creation of adam', 'creation of adam'],
  },
  {
    id: 'the-kiss',
    title: 'The Kiss',
    artist: 'Gustav Klimt',
    year: '1907–1908',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg/800px-The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
    acceptedTitles: ['the kiss', 'der kuss'],
  },
  {
    id: 'school-of-athens',
    title: 'The School of Athens',
    artist: 'Raphael',
    year: '1509–1511',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/1280px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg',
    acceptedTitles: ['the school of athens', 'school of athens', 'scuola di atene'],
  },
  {
    id: 'las-meninas',
    title: 'Las Meninas',
    artist: 'Diego Velázquez',
    year: '1656',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg/800px-Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg',
    acceptedTitles: ['las meninas'],
  },
  {
    id: 'wanderer',
    title: 'Wanderer above the Sea of Fog',
    artist: 'Caspar David Friedrich',
    year: '1818',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg/800px-Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg',
    acceptedTitles: ['wanderer above the sea of fog', 'wanderer above the fog', 'der wanderer über dem nebelmeer'],
  },
  {
    id: 'starry-night-rhone',
    title: 'Starry Night Over the Rhône',
    artist: 'Vincent van Gogh',
    year: '1888',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Starry_Night_Over_the_Rh%C3%B4ne.jpg/1280px-Starry_Night_Over_the_Rh%C3%B4ne.jpg',
    acceptedTitles: ['starry night over the rhone', 'starry night over the rhône', 'starry night on the rhone'],
  },
  {
    id: 'venus-de-milo',
    title: 'Venus de Milo',
    artist: 'Alexandros of Antioch',
    year: '~130–100 BC',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/04_-_Aphrodite_of_Milos.jpg/800px-04_-_Aphrodite_of_Milos.jpg',
    acceptedTitles: ['venus de milo', 'aphrodite of milos', 'aphrodite of melos'],
  },
];

export function getPainting(id: string): Painting | undefined {
  return PAINTINGS.find(p => p.id === id);
}

export function getRandomPainting(excludeId?: string): Painting {
  const pool = excludeId ? PAINTINGS.filter(p => p.id !== excludeId) : PAINTINGS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function checkGuess(guess: string, paintingId: string): boolean {
  const painting = getPainting(paintingId);
  if (!painting) return false;
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  const guessNorm = normalize(guess);
  return painting.acceptedTitles.some(t => normalize(t) === guessNorm);
}
