import { Book } from '@/types';

export const BOOKS: Book[] = [
  {
    id: 'meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    year: 'c. 180 AD',
    category: 'Philosophy',
    coverGradient: 'from-amber-700 via-amber-800 to-stone-900',
    synopsis: 'Private reflections and timeless Stoic wisdom on duty, resilience, mortality, and inner tranquility from the Roman Emperor.',
    totalWords: 1450,
    chapters: [
      {
        id: 'book-2',
        title: 'Book II: On the River Granua',
        chapterNumber: 2,
        wordCount: 380,
        text: "When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine. And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my kin, or hate them. We were made to work together like hands, like feet, like the rows of the upper and lower teeth. To obstruct each other is unnatural. To feel anger at someone, to turn your back on him: these are obstructions."
      },
      {
        id: 'book-4',
        title: 'Book IV: The Inner Citadel',
        chapterNumber: 4,
        wordCount: 360,
        text: "People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind. Especially if he has within himself those things to look into and immediately be in total ease. Constantly give yourself this retreat, and renew yourself. Let your basic principles be brief and fundamental, the kind that will immediately wash away all sorrow and send you back without irritation to the life to which you must return."
      },
      {
        id: 'book-7',
        title: 'Book VII: The Universe and Change',
        chapterNumber: 7,
        wordCount: 350,
        text: "Time is a river, a violent current of events, glimpsed once and already carried past us, and another follows and is gone. Everything that happens is as common and familiar as the rose in spring and the grape in summer; for such is sickness and death and evil and intrigue and all the things that delight or distress fools. Look beneath the surface; never let the several quality of a thing nor its worth escape you."
      },
      {
        id: 'book-12',
        title: 'Book XII: The Final Farewell',
        chapterNumber: 12,
        wordCount: 360,
        text: "Mortal man, you have lived as a citizen in this great city; what matters if for five years or fifty? The law is equal for all. Where then is the hardship if you are sent away from the city not by a tyrant or an unjust judge, but by nature, which brought you into it? Just as a comic actor is dismissed by the manager who hired him. 'But I have only played three acts.' Very true; but in life three acts make up the whole play. Depart then with a good grace, for he who dismisses you is gracious."
      }
    ]
  },
  {
    id: 'art-of-war',
    title: 'The Art of War',
    author: 'Sun Tzu',
    year: '5th Century BC',
    category: 'Philosophy',
    coverGradient: 'from-red-800 via-rose-950 to-neutral-900',
    synopsis: 'The foundational treatise on strategy, tactical positioning, deception, psychology, and achieving victory without conflict.',
    totalWords: 1250,
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter I: Laying Plans',
        chapterNumber: 1,
        wordCount: 320,
        text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. All warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near."
      },
      {
        id: 'ch-3',
        title: 'Chapter III: Attack by Stratagem',
        chapterNumber: 3,
        wordCount: 330,
        text: "In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting. If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle."
      },
      {
        id: 'ch-6',
        title: 'Chapter VI: Weak Points and Strong',
        chapterNumber: 6,
        wordCount: 310,
        text: "Whoever is first in the field and awaits the coming of the enemy, will be fresh for the fight; whoever is second in the field and has to hasten to battle will arrive exhausted. Therefore the clever combatant imposes his will on the enemy, but does not allow the enemy's will to be imposed on him. Water shapes its course according to the nature of the ground over which it flows; the soldier works out his victory in relation to the foe whom he is facing."
      }
    ]
  },
  {
    id: 'the-prophet',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    year: 1923,
    category: 'Poetry',
    coverGradient: 'from-emerald-800 via-teal-950 to-slate-900',
    synopsis: 'Poetic meditations on love, work, sorrow, freedom, and the spiritual architecture of human life.',
    totalWords: 1200,
    chapters: [
      {
        id: 'on-love',
        title: 'On Love',
        chapterNumber: 1,
        wordCount: 300,
        text: "When love beckons to you, follow him, though his ways are hard and steep. And when his wings enfold you yield to him, though the sword hidden among his pinions may wound you. And when he speaks to you believe in him, though his voice may shatter your dreams as the north wind lays waste the garden. For even as love crowns you so shall he crucify you. Even as he is for your growth so is he for your pruning. Love gives naught but itself and takes naught but from itself. Love possesses not nor would it be possessed; for love is sufficient unto love."
      },
      {
        id: 'on-work',
        title: 'On Work',
        chapterNumber: 2,
        wordCount: 290,
        text: "You have been told also that life is darkness, and in your weariness you echo what was said by the weary. And I say that life is indeed darkness save when there is urge, and all urge is blind save when there is knowledge, and all knowledge is vain save when there is work, and all work is empty save when there is love; and when you work with love you bind yourself to yourself, and to one another, and to God. Work is love made visible."
      },
      {
        id: 'on-joy-and-sorrow',
        title: 'On Joy and Sorrow',
        chapterNumber: 3,
        wordCount: 280,
        text: "Your joy is your sorrow unmasked. And the selfsame well from which your laughter rises was oftentimes filled with your tears. And how else can it be? The deeper that sorrow carves into your being, the more joy you can contain. Is not the cup that holds your wine the very cup that was burned in the potter's oven? And is not the lute that soothes your spirit, the very wood that was hollowed with knives?"
      }
    ]
  },
  {
    id: 'metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    year: 1915,
    category: 'Classic Fiction',
    coverGradient: 'from-stone-700 via-zinc-900 to-stone-950',
    synopsis: 'Gregor Samsa wakes one morning to find himself transformed into a monstrous insect, examining alienation and familial duty.',
    totalWords: 1300,
    chapters: [
      {
        id: 'chapter-1',
        title: 'Chapter I: The Awakening',
        chapterNumber: 1,
        wordCount: 350,
        text: "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. 'What's happened to me?' he thought. It wasn't a dream."
      },
      {
        id: 'chapter-2',
        title: 'Chapter II: The Room and the Family',
        chapterNumber: 2,
        wordCount: 340,
        text: "It was not until dusk that Gregor awoke from his deep, coma-like sleep. He was not much later in waking than he would have been anyway, but he felt rested and refreshed. His left side felt like one single long, unpleasantly taut scar, and he had to limp along on his two rows of legs. One little leg, moreover, had been seriously injured in the course of the morning's events; it dragged behind him lifelessly."
      },
      {
        id: 'chapter-3',
        title: 'Chapter III: The Quiet Resolution',
        chapterNumber: 3,
        wordCount: 330,
        text: "No one paid any attention to Gregor. The rotten apple in his back and the inflamed surrounding area, which were entirely covered with white dust, were hardly noticed. He thought back on his family with deep affection and love. His opinion that he must disappear was perhaps even more determined than his sister's. He remained in this state of empty and peaceful reflection until the tower clock struck three in the morning."
      }
    ]
  },
  {
    id: 'dorian-gray',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: 1890,
    category: 'Classic Fiction',
    coverGradient: 'from-purple-900 via-indigo-950 to-neutral-900',
    synopsis: 'A hedonistic aristocrat trades his soul for eternal youth while his portrait bears the moral weight of his sins.',
    totalWords: 1200,
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter I: The Studio',
        chapterNumber: 1,
        wordCount: 320,
        text: "The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn. In the centre of the room, clamped to an upright easel, stood the full-length portrait of a young man of extraordinary personal beauty, and in front of it, some little distance away, was sitting the artist himself, Basil Hallward."
      },
      {
        id: 'ch-2',
        title: 'Chapter II: The Gift of Youth',
        chapterNumber: 2,
        wordCount: 340,
        text: "Lord Henry looked at him. Yes, he was certainly wonderfully handsome, with his finely curved scarlet lips, his frank blue eyes, his crisp gold hair. 'Youth! Youth! There is absolutely nothing in the world but youth!' Dorian Gray listened, open-eyed and wondering. 'How sad it is!' murmured Dorian Gray with his eyes still fixed upon his own portrait. 'How sad it is! I shall grow old, and horrible, and dreadful. But this picture will remain always young. If it were only the other way!'"
      }
    ]
  },
  {
    id: 'the-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    category: 'Classic Fiction',
    coverGradient: 'from-blue-900 via-cyan-950 to-slate-900',
    synopsis: 'Nick Carraway is drawn into the lavish world and enigmatic obsessions of Jay Gatsby on Long Island.',
    totalWords: 1100,
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter I: Advice and Long Island Sound',
        chapterNumber: 1,
        wordCount: 350,
        text: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. 'Whenever you feel like criticizing any one,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.' In consequence, I'm inclined to reserve all judgements, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores."
      },
      {
        id: 'ch-9',
        title: 'Chapter IX: The Green Light',
        chapterNumber: 9,
        wordCount: 300,
        text: "Gatsby believed in the green light, the orgastic future that year by year recedes before us. It eluded us then, but that's no matter—tomorrow we will run faster, stretch out our arms farther. And one fine morning—So we beat on, boats against the current, borne back ceaselessly into the past."
      }
    ]
  },
  {
    id: 'letters-from-a-stoic',
    title: 'Letters from a Stoic',
    author: 'Seneca',
    year: 'c. 65 AD',
    category: 'Philosophy',
    coverGradient: 'from-amber-900 via-orange-950 to-neutral-900',
    synopsis: 'Epistles to Lucilius on the saving of time, calmness in adversity, true friendship, and living with purpose.',
    totalWords: 1150,
    chapters: [
      {
        id: 'letter-1',
        title: 'Letter I: On Saving Time',
        chapterNumber: 1,
        wordCount: 340,
        text: "Continue to act thus, my dear Lucilius—set yourself free for your own sake; gather and save your time, which heretofore has been taken away, or stolen, or has simply slipped away. Convince yourself of what I say: certain portions of time are torn from us, some are gently stolen, and some slip away. But the most disgraceful waste is that which is due to carelessness. What man can you show me who places any value on his time, who reckons the worth of each day, who understands that he is dying daily?"
      },
      {
        id: 'letter-2',
        title: 'Letter II: On Discursiveness in Reading',
        chapterNumber: 2,
        wordCount: 320,
        text: "Judging by what you write me and by what I hear, I am full of great hopes for you. You do not run about and change your abode and stir up restlessness. Such roaming indicates a sick mind. The first sign of a calm and settled mind is the ability to stay in one place and linger in one's own company. Be careful, however, that your reading of many authors and all kinds of books does not have something wandering and unsteady about it."
      }
    ]
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    category: 'Classic Fiction',
    coverGradient: 'from-teal-900 via-slate-900 to-zinc-950',
    synopsis: 'Victor Frankenstein discovers the secret of life and unleashes consequences that reshape his understanding of humanity.',
    totalWords: 1100,
    chapters: [
      {
        id: 'ch-4',
        title: 'Chapter IV: The Spark of Being',
        chapterNumber: 4,
        wordCount: 330,
        text: "It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs."
      }
    ]
  }
];
