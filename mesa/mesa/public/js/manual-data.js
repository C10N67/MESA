/* Mesa · el manual del DM

   Centrado en la 5.5 (la revisión de 2024): una chuleta para tenerla a mano
   durante la partida y, en páginas propias (manual.js), el reglamento, los
   estados, los conjuros, las armas y armaduras, las especies y las criaturas
   del SRD 5.2, traducidos (public/data/srd52/). Las ediciones anteriores
   quedan aparte, resumidas con palabras propias.

   Las reglas de la 5.ª salen del documento de referencia (SRD 5.1 y 5.2), que
   Wizards of the Coast publica con licencia Creative Commons CC-BY-4.0.

   Cada edición puede tener «page»: entonces su contenido lo pinta manual.js
   (catálogos con filtros) en vez de salir de SECTIONS.

   Formato del texto, para no cargar con un intérprete de Markdown entero:
     línea en blanco      párrafo nuevo
     «- » al empezar       lista
     «| a | b |»           fila de tabla (la primera, cabecera)
     «## título»           subtítulo
     **negrita**
   Todo se escapa antes de pintarlo. */

export const EDITIONS = [
  { id: "intro", group: "D&D 5.5 (2024)", short: "Guía", name: "Cómo usar este manual" },
  { id: "e2024", group: "D&D 5.5 (2024)", short: "Qué es la 5.5", name: "D&D 2024, la «5.5»" },
  { id: "quick", group: "D&D 5.5 (2024)", short: "Chuleta", name: "Chuleta de la 5.5" },
  { id: "reglamento", group: "D&D 5.5 (2024)", short: "Reglamento", name: "Reglamento", page: "rules" },
  { id: "estados", group: "D&D 5.5 (2024)", short: "Estados", name: "Estados", page: "conditions" },
  { id: "conjuros", group: "D&D 5.5 (2024)", short: "Conjuros", name: "Conjuros", page: "spells" },
  { id: "equipo", group: "D&D 5.5 (2024)", short: "Armas y armaduras", name: "Armas y armaduras", page: "gear" },
  { id: "especies", group: "D&D 5.5 (2024)", short: "Especies", name: "Especies", page: "species" },
  { id: "criaturas", group: "D&D 5.5 (2024)", short: "Criaturas", name: "Criaturas", page: "creatures" },
  { id: "odd", group: "Otras ediciones", short: "OD&D", name: "Dungeons & Dragons original (1974)" },
  { id: "basic", group: "Otras ediciones", short: "Basic", name: "D&D Básico: Holmes, B/X, BECMI y Rules Cyclopedia (1977–1991)" },
  { id: "add1", group: "Otras ediciones", short: "AD&D 1.ª", name: "Advanced Dungeons & Dragons, 1.ª edición (1977–1979)" },
  { id: "add2", group: "Otras ediciones", short: "AD&D 2.ª", name: "Advanced Dungeons & Dragons, 2.ª edición (1989)" },
  { id: "e3", group: "Otras ediciones", short: "3.0 / 3.5", name: "D&D 3.ª edición y 3.5 (2000 y 2003)" },
  { id: "e4", group: "Otras ediciones", short: "4.ª", name: "D&D 4.ª edición (2008)" },
  { id: "e5", group: "Otras ediciones", short: "5.ª (2014)", name: "D&D 5.ª edición (2014)" },
  { id: "compare", group: "Otras ediciones", short: "Comparativa", name: "Las ediciones, cara a cara" },
  { id: "credits", group: "", short: "Créditos", name: "Fuentes y licencias" }
];

export const SECTIONS = [
  /* ---------- Guía ---------- */
  { ed: "intro", title: "Para qué sirve", text: `
El manual del DM para jugar a la **5.5** (D&D 2024) sin abrir el libro en mitad de la partida:

- **Chuleta**: lo que más se consulta en la mesa (CD, acciones, cobertura, descansos, encuentros…).
- **Reglamento**: las reglas de juego completas del SRD 5.2, traducidas.
- **Estados**: los quince estados de 2024, con su icono, como salen en el mapa.
- **Conjuros**: los 339 conjuros y trucos del SRD 5.2, con filtros por nivel, clase, escuela, concentración y ritual.
- **Armas y armaduras**: tablas con daño, propiedades, maestría, peso y coste.
- **Especies**: las nueve especies de la 5.5 con todos sus rasgos.
- **Criaturas**: las 331 fichas del SRD 5.2, animales incluidos, filtrables por tipo y desafío.

Usa el buscador de arriba: busca «bola de fuego», «lobo», «agarrar», «agotamiento» o el nombre en inglés, y salen el texto, los conjuros, las criaturas y las reglas donde aparece. Las **otras ediciones** de D&D siguen al final del índice, resumidas.

El SRD 5.2 es el reglamento libre de la 5.5: recoge casi todo el Manual del jugador, la Guía del DM y el Manual de monstruos, pero no todo (faltan algunas subclases, conjuros, monstruos y la ambientación).` },
  { ed: "intro", title: "La línea del tiempo", text: `
| Año | Edición | Editorial | Lo más reconocible |
| 1974 | D&D original (OD&D) | TSR | Tres librillos; tres clases; todo d6 |
| 1977 | Basic de Holmes | TSR | Primera caja para empezar, niveles 1–3 |
| 1977–79 | AD&D 1.ª edición | TSR | Manual del Jugador, del DM y de Monstruos; nueve alineamientos |
| 1981 | Basic/Expert (B/X) | TSR | Raza como clase, reglas cortas y claras |
| 1983–86 | BECMI | TSR | Cinco cajas, del nivel 1 a la inmortalidad |
| 1989 | AD&D 2.ª edición | TSR | THAC0, kits, mundos de campaña |
| 1991 | Rules Cyclopedia | TSR | El Básico entero en un tomo |
| 1997 | — | Wizards of the Coast compra TSR | |
| 2000 | D&D 3.ª edición | Wizards | Sistema d20, CA ascendente, dotes y habilidades |
| 2003 | D&D 3.5 | Wizards | Revisión de la 3.ª |
| 2008 | D&D 4.ª edición | Wizards | Poderes para todas las clases, roles, combate táctico |
| 2014 | D&D 5.ª edición | Wizards | Ventaja y desventaja, precisión acotada |
| 2024 | Revisión de la 5.ª | Wizards | Trasfondos con mejoras, maestría con armas, especies |

Las ediciones de TSR (hasta 1997) pasaron a Wizards of the Coast con la compra de la empresa, y Wizards las sigue reeditando en PDF e impresión bajo demanda.` },
  { ed: "intro", title: "Cosas que cambian de nombre", text: `
- **CA descendente y ascendente.** Hasta la 2.ª, cuanto más baja la CA, mejor (de 10 sin armadura a −10). Desde la 3.ª, cuanto más alta, mejor. Para convertir: CA ascendente = 19 − CA descendente (una CA 2 de AD&D es una CA 17).
- **THAC0** («para impactar a CA 0»): la tirada que necesitas para dar a una CA 0. Para dar a otra CA: THAC0 − CA del objetivo. Equivale a un bonificador de ataque de 20 − THAC0.
- **Dado de golpe, dado de vida, dado de puntos de golpe**: el mismo concepto según la edición y la traducción.
- **Raza, especie, linaje**: la 5.ª de 2014 dice raza; la revisión de 2024, especie.
- **Asalto (round), turno (turn)**: en las ediciones antiguas un «turno» son 10 minutos de exploración, no la jugada de un personaje.` },

  /* ---------- OD&D ---------- */
  { ed: "odd", title: "Qué es", text: `
El juego que lo empezó todo, de Gary Gygax y Dave Arneson, publicado por TSR en enero de 1974 en una caja con tres librillos: **Men & Magic** (personajes y magia), **Monsters & Treasure** (monstruos y tesoros) y **The Underworld & Wilderness Adventures** (mazmorras y viajes). Daba por hecho que tenías el juego de miniaturas **Chainmail** y el juego de mesa Outdoor Survival.

Es un reglamento corto y lleno de huecos que el árbitro rellena: el estilo de la época era decidir sobre la marcha, no buscar la regla.` },
  { ed: "odd", title: "Personajes", text: `
- **Características**: Fuerza, Inteligencia, Sabiduría, Constitución, Destreza y Carisma, 3d6 en orden. Influyen poco: sobre todo en la experiencia que ganas.
- **Clases**: Guerrero (Fighting-Man), Usuario de magia (Magic-User) y Clérigo.
- **Razas**: humano, enano, elfo y «hobbit» (luego mediano). Los no humanos tienen límites de nivel.
- **Alineamiento**: Ley, Neutralidad o Caos.
- **Puntos de golpe**: un d6 por nivel para todos (los guerreros, con alguno extra).
- **Experiencia**: sobre todo por el oro que sacas de la mazmorra (1 po = 1 PX), más los monstruos vencidos.

Los suplementos ampliaron mucho el juego: **Greyhawk** (1975) trajo al ladrón y al paladín y el daño distinto para cada arma; **Blackmoor** (1975), al monje y al asesino; **Eldritch Wizardry** (1976), al druida y los poderes psiónicos; **Gods, Demi-Gods & Heroes** (1976), los panteones.` },
  { ed: "odd", title: "Cómo se juega", text: `
- **Ataque**: tiras 1d20 y consultas una tabla según tu nivel y la CA del objetivo (o usas el combate de Chainmail).
- **Daño**: todas las armas hacen 1d6.
- **CA descendente**: 9 sin armadura, 2 con armadura de placas y escudo.
- **Salvaciones** en cinco categorías: muerte o veneno, varitas, petrificación o parálisis, aliento de dragón, y conjuros o bastones.
- **Magia vanciana**: el mago memoriza sus conjuros y los olvida al lanzarlos. Los clérigos no tienen conjuros a nivel 1.
- **Tiempo**: en la mazmorra se cuenta por turnos de 10 minutos; con monstruos errantes cada pocos turnos.` },
  { ed: "odd", title: "Si lo diriges hoy", text: `
- Decide antes las dudas que el libro no resuelve y apúntalas: es lo que hacían todas las mesas.
- Los personajes son frágiles: la astucia vale más que la ficha. Premia evitar combates y engañar a los monstruos.
- Para usar aventuras de OD&D con la 5.ª: CA ascendente = 19 − CA; los dados de golpe del monstruo, como d8; y sube algo los PV de los monstruos o bajará todo demasiado rápido.` },

  /* ---------- Basic ---------- */
  { ed: "basic", title: "Qué es", text: `
La línea «de iniciación» de D&D, paralela a AD&D:

- **Holmes Basic** (1977), de J. Eric Holmes: ordena OD&D para los niveles 1 a 3.
- **B/X** (1981): Basic de Tom Moldvay (niveles 1–3) y Expert de David Cook y Steve Marsh (hasta el 14). Muy querida por su claridad.
- **BECMI** (1983–1986), de Frank Mentzer: cinco cajas, Basic, Expert, Companion, Master e Immortals, del nivel 1 al 36 y más allá.
- **Rules Cyclopedia** (1991), de Aaron Allston: todo el Básico (salvo la inmortalidad) en un solo libro.

Es la base de muchos juegos de la «vieja escuela» de hoy (Old-School Essentials, Basic Fantasy…).` },
  { ed: "basic", title: "Personajes", text: `
- **Raza como clase**: Clérigo, Guerrero, Mago (Magic-User), Ladrón, y además **Enano**, **Elfo** y **Mediano**, que son clase y raza a la vez. Límites de nivel: enano 12, elfo 10, mediano 8.
- **Alineamiento**: Legal, Neutral o Caótico.
- **Modificadores de característica**: 3 → −3; 4–5 → −2; 6–8 → −1; 9–12 → 0; 13–15 → +1; 16–17 → +2; 18 → +3.
- **Experiencia**: por tesoro y por monstruos, como en OD&D.` },
  { ed: "basic", title: "Cómo se juega", text: `
- **Iniciativa**: 1d6 por bando cada asalto; el más alto actúa primero.
- **Ataque**: 1d20 contra una tabla según nivel y CA del objetivo (CA descendente).
- **Daño**: 1d6 con cualquier arma; el daño distinto por arma era opcional.
- **Salvaciones** en cinco categorías: rayo de muerte o veneno; varitas mágicas; parálisis o petrificación; aliento de dragón; varas, bastones o conjuros.
- **Moral**: los monstruos tiran 2d6 contra su moral para no huir.
- **Reacción**: 2d6 para ver cómo recibe a la party alguien a quien se encuentran.
- **Tiempo**: asaltos de 10 segundos en combate; turnos de 10 minutos explorando; un monstruo errante cada dos turnos (1 en 1d6).
- **Carga y movimiento**: 120 pies por turno sin carga (40 por asalto), menos cuanto más llevas.` },
  { ed: "basic", title: "Si lo diriges hoy", text: `
- Es la edición más fácil de dirigir sin preparar: las reglas caben en una tarde y los combates vuelan.
- La exploración es el corazón del juego: luz, comida, tiempo, monstruos errantes. Llevar la cuenta de los turnos lo hace tenso.
- Para pasarlo a la 5.ª: bonificador de ataque del monstruo ≈ sus dados de golpe + 1; CA = 19 − CA descendente; CD de sus efectos ≈ 10 + la mitad de sus dados de golpe.` },

  /* ---------- AD&D 1.ª ---------- */
  { ed: "add1", title: "Qué es", text: `
La versión «avanzada» de Gary Gygax, con las reglas mucho más completas y cerradas: **Monster Manual** (1977), **Players Handbook** (1978) y **Dungeon Masters Guide** (1979). Convivió con el Básico como un juego aparte.

Su DMG es famoso por su prosa y por tablas para todo: encuentros aleatorios, burdeles, enfermedades, cómo envejecen los personajes. **Unearthed Arcana** (1985) añadió el caballero (Cavalier), el bárbaro, la especialización con armas y nuevas razas como el drow.` },
  { ed: "add1", title: "Personajes", text: `
- **Clases**: clérigo (y su variante, el druida), guerrero (paladín, explorador), mago (ilusionista), ladrón (asesino) y monje. El bardo aparece en un apéndice, como clase a la que se llega tras cambiar de clase.
- **Razas**: humano, enano, elfo, gnomo, semielfo, mediano y semiorco, con límites de nivel y de clase para los no humanos.
- **Multiclase** para los no humanos (avanzan a la vez en dos o tres clases) y **doble clase** para los humanos (dejan una y empiezan otra).
- **Nueve alineamientos**: legal, neutral o caótico, combinado con bueno, neutral o malvado.
- **Fuerza excepcional**: los guerreros con 18 tiran percentil (18/01 a 18/00) para bonos enormes.` },
  { ed: "add1", title: "Cómo se juega", text: `
- **Asalto de un minuto**, dividido en 10 segmentos. Iniciativa con 1d6 por bando.
- **Ataque**: 1d20 en las matrices de combate según clase, nivel y CA. Ajustes de arma contra tipo de armadura y factor de velocidad de cada arma.
- **Salvaciones** en cinco categorías: parálisis, veneno o magia de muerte; petrificación o polimorfia; vara, bastón o varita; aliento; conjuro.
- **Conjuros**: memorizados al estilo vanciano, con componentes y tiempos de lanzamiento en segmentos; un golpe interrumpe el conjuro.
- **Experiencia**: tesoro y monstruos; el DM puede dar más por buen juego de rol.` },
  { ed: "add1", title: "Si lo diriges hoy", text: `
- Escoge de antemano qué reglas usas (segmentos, velocidad de armas, armas contra armaduras…): pocas mesas las usaban todas.
- Los módulos clásicos de la época (la serie G de gigantes, la D del Infraoscuro, la Tumba de los horrores) siguen siendo excelentes y fáciles de adaptar.
- Para pasar monstruos a la 5.ª: usa su ficha de 5.ª si existe; si no, CA = 19 − CA, bonificador de ataque ≈ 20 − THAC0 o dados de golpe + 2, y el daño tal cual.` },

  /* ---------- AD&D 2.ª ---------- */
  { ed: "add2", title: "Qué es", text: `
La revisión de AD&D de 1989, dirigida por David «Zeb» Cook. Ordenó y limpió la 1.ª, quitó lo más polémico de la época (los demonios y diablos pasaron a llamarse tanar'ri y baatezu; el asesino y el semiorco salieron del libro básico) y llenó las estanterías de suplementos.

Es la edición de los **mundos de campaña**: Reinos Olvidados, Dragonlance, Greyhawk, Ravenloft, Dark Sun, Planescape, Spelljammer, Al-Qadim, Birthright. En 1995 se reeditó con portadas negras y llegaron los Player's Option. En 1997 Wizards of the Coast compró TSR.` },
  { ed: "add2", title: "Personajes", text: `
- **Grupos de clases**: Guerreros (guerrero, paladín, explorador), Magos (mago y especialistas por escuela: ilusionista, nigromante…), Sacerdotes (clérigo, druida, sacerdotes de un dios concreto) y Pícaros (ladrón, bardo).
- **Razas**: humano, enano, elfo, gnomo, semielfo y mediano.
- **Competencias**: con armas y sin armas (oficios y conocimientos), opcionales pero casi universales.
- **Kits**: variantes de clase de los «Complete Handbook» (el espadachín, el bárbaro, el bardo bufón…).
- **Especialización con armas** para guerreros: un ataque y medio por asalto, +1 al ataque, +2 al daño.` },
  { ed: "add2", title: "Cómo se juega", text: `
- **THAC0**: la tirada que necesitas para dar a CA 0. Para dar a una CA concreta: THAC0 − CA. Un guerrero de nivel 1 tiene THAC0 20; mejora 1 por nivel.
- **Iniciativa**: 1d10 por bando, el más bajo actúa primero, con modificadores por arma y conjuro.
- **Asalto** de un minuto; un turno, 10 minutos.
- **Salvaciones** en las mismas cinco categorías de la 1.ª, con tablas por grupo de clase.
- **Conjuros** de mago por escuelas y de sacerdote por esferas.
- **Experiencia**: además de monstruos y tesoro, cada clase gana por lo suyo (el ladrón por robar, el mago por lanzar conjuros…), a criterio del DM.` },
  { ed: "add2", title: "Si lo diriges hoy", text: `
- THAC0 se entiende rápido así: «bonificador de ataque = 20 − THAC0», y luego tiras contra la CA ascendente (19 − CA). Es la misma cuenta.
- Las aventuras y ambientaciones de 2.ª son una mina: muchas tienen versión de 5.ª (Ravenloft, Spelljammer, Planescape), y las que no, se adaptan bien.
- Los PV y el daño de 2.ª son más bajos que en 5.ª: al convertir, sube los PV de los monstruos un 50 % aproximadamente.` },

  /* ---------- 3.ª y 3.5 ---------- */
  { ed: "e3", title: "Qué es", text: `
La primera edición de Wizards of the Coast (agosto de 2000), de Jonathan Tweet, Monte Cook y Skip Williams. Unificó todas las reglas en el **sistema d20** y las publicó como **SRD** con la licencia abierta OGL, lo que llenó el mercado de libros de otras editoriales. La **3.5** (2003) la revisó: arregló clases flojas (explorador, bardo), cambió la reducción de daño y acortó la duración de muchos conjuros.

De la 3.5 salió también Pathfinder (2009, de Paizo), que no es de Wizards.` },
  { ed: "e3", title: "Personajes", text: `
- **Clases**: bárbaro, bardo, clérigo, druida, guerrero, monje, paladín, explorador, pícaro, hechicero y mago. Más las **clases de prestigio**, a las que se entra cumpliendo requisitos.
- **Razas**: humano, enano, elfo, gnomo, semielfo, semiorco y mediano. Sin límites de nivel.
- **Multiclase libre**: cada nivel puede ser de una clase distinta.
- **Habilidades con rangos** (Avistar, Escuchar, Saltar, Concentración…) que se compran con puntos al subir de nivel.
- **Dotes**: talentos que se eligen cada tres niveles (más los extras del guerrero y de los humanos).
- **Modificador** = (característica − 10) / 2, redondeando abajo, igual que en la 5.ª.` },
  { ed: "e3", title: "Cómo se juega", text: `
- **La regla d20**: tiras 1d20 + modificadores contra un número (CA o CD). Si lo igualas o lo pasas, lo consigues.
- **Ataque**: 1d20 + **ataque base** + Fuerza o Destreza contra la **CA ascendente**. El ataque base sube con el nivel y da ataques extra (+6/+1, +11/+6/+1…).
- **Tres salvaciones**: Fortaleza, Reflejos y Voluntad.
- **Combate táctico** en casillas de 5 pies: ataques de oportunidad, flanqueo, alcance, acciones estándar, de movimiento, de asalto completo y gratuitas.
- **Desafío**: cada monstruo tiene un VD y cada encuentro un nivel de encuentro, para calcular la dificultad y la experiencia.
- **Conjuros** vancianos para el mago y el clérigo; el hechicero, en cambio, lanza los que conoce sin prepararlos.` },
  { ed: "e3", title: "Si lo diriges hoy", text: `
- Las fichas de nivel alto son largas: ten a mano las de los PNJ importantes ya calculadas.
- Los conjuros de mejora (bendecir, fuerza de toro…) cambian mucho los números: pide a los jugadores que los apunten en su ficha.
- De 3.5 a 5.ª: VD parecido; el bonificador de ataque de un monstruo de 3.5 suele ser demasiado alto para la 5.ª (baja hasta competencia + característica); las CA de 3.5 por encima de 20 se dejan entre 15 y 19.` },

  /* ---------- 4.ª ---------- */
  { ed: "e4", title: "Qué es", text: `
La edición de 2008, de Rob Heinsoo, Andy Collins y James Wyatt. Rediseñó el juego desde cero alrededor de un combate táctico equilibrado: todas las clases tienen **poderes** con el mismo formato y los monstruos están pensados para el tablero. Usó otra licencia (GSL, más cerrada que la OGL) y herramientas en línea (D&D Insider, con su creador de personajes). En 2010 llegó la línea **Essentials**, con clases más sencillas.` },
  { ed: "e4", title: "Personajes", text: `
- **Niveles 1 a 30**, en tres tramos: heroico (1–10), de leyenda (11–20, con su **senda de leyenda**) y épico (21–30, con su **destino épico**).
- **Roles**: defensor (atrae y aguanta), atacante (striker, mucho daño a un objetivo), líder (cura y potencia) y controlador (áreas y estados).
- **Fuentes de poder**: arcana, divina y marcial en el primer libro; luego primigenia, psiónica y sombría.
- **Clases del primer Manual del jugador**: clérigo, guerrero, paladín, explorador, pícaro, brujo, señor de la guerra y mago.
- **Razas**: dracónido, enano, eladrín, elfo, semielfo, mediano, humano y tiefling.
- **Alineamientos**: legal bueno, bueno, sin alineamiento, malvado y caótico malvado.` },
  { ed: "e4", title: "Cómo se juega", text: `
- **Poderes**: a voluntad (siempre), de encuentro (una vez por combate), diarios (una vez al día) y de utilidad.
- **Ataque contra defensa**: 1d20 + característica + la mitad de tu nivel (y el arma) contra una de cuatro defensas: **CA, Fortaleza, Reflejos o Voluntad**. Ya no hay salvaciones para evitar un efecto: ataca quien lo provoca.
- **Salvación** = 1d20 al final de tu turno; con 10 o más se acaba un efecto que dura.
- **Recuperaciones** (healing surges): unas cuantas al día, cada una cura un cuarto de tus PV. **Segundo aliento** en combate.
- **Ensangrentado**: a la mitad de PV, que activa muchos poderes.
- **Puntos de acción** para una acción extra; **descanso corto** de 5 minutos y **largo** de 6 horas.
- **Monstruos por rol**: artillero, bruto, controlador, acechador, hostigador y soldado, además de **esbirros** (1 PV), **élites** y **solitarios**.
- **Desafíos de habilidad**: un encuentro que no es combate, resuelto con varias pruebas de habilidad.` },
  { ed: "e4", title: "Si lo diriges hoy", text: `
- Es la edición con los combates más fáciles de preparar: un monstruo de su nivel con su rol funciona sin ajustes.
- Ideas que se llevan bien a la 5.ª: los esbirros (1 PV), los monstruos solitarios con varias acciones, «ensangrentado» como disparador y los desafíos de habilidad.
- Para pasar monstruos a la 5.ª: bonificador de ataque ≈ ataque de 4.ª − la mitad de su nivel; CA ≈ CA de 4.ª − la mitad de su nivel; PV más o menos igual.` },

  /* ---------- 5.ª 2014 ---------- */
  { ed: "e5", title: "Qué es", text: `
La edición de 2014, de Mike Mearls y Jeremy Crawford, tras dos años de pruebas abiertas («D&D Next»). Se propuso juntar lo mejor de todas las anteriores con reglas cortas: es la edición más jugada de la historia. El **SRD 5.1** recoge sus reglas básicas; desde 2023 está publicado con licencia Creative Commons (CC-BY-4.0).

Mesa la sigue admitiendo: el creador de personajes deja elegir 2014 o 2024, y el bestiario de la mesa sale del SRD 5.1.` },
  { ed: "e5", title: "Personajes", text: `
- **Clases**: bárbaro, bardo, clérigo, druida, guerrero, monje, paladín, explorador, pícaro, hechicero, brujo y mago (y el artífice, de Eberron). Cada una elige **subclase** a nivel 1, 2 o 3.
- **Razas**: enano, elfo, mediano, humano, dracónido, gnomo, semielfo, semiorco y tiefling en el Manual del jugador. La raza da las mejoras de característica (desde 2020 se pueden mover libremente con la regla de origen personalizado).
- **Trasfondos**: dos habilidades, herramientas o idiomas, un rasgo y rasgos de personalidad (ideales, vínculos y defectos).
- **Bonificador de competencia** de +2 a +6 según el nivel, para todo en lo que se es competente.
- **Mejoras de característica** a niveles 4, 8, 12, 16 y 19 (o una dote, que es opcional).
- **Multiclase** opcional, con 13 en la característica principal de ambas clases.` },
  { ed: "e5", title: "Cómo se juega", text: `
- **Tirada d20**: 1d20 + modificador (+ competencia si procede) contra una CA o una CD.
- **Ventaja y desventaja**: tiras dos d20 y te quedas con el mejor o el peor. No se acumulan.
- **Precisión acotada**: los números crecen poco, así que un orco sigue siendo peligroso a nivel 10.
- **Seis salvaciones**, una por característica.
- **En tu turno**: movimiento, una acción, quizá una acción adicional, y una reacción por asalto.
- **Concentración**: un solo conjuro de concentración a la vez; al recibir daño, salvación de Constitución (CD 10 o la mitad del daño, la que sea mayor).
- **Descansos**: corto de una hora (gastas dados de golpe para curar) y largo de 8 horas (recuperas todos los PV y la mitad de los dados de golpe).
- **Conjuros**: espacios por nivel; lanzar con un espacio más alto lo potencia; los trucos se lanzan a voluntad.` },
  { ed: "e5", title: "Si lo diriges hoy", text: `
- Apóyate en la ventaja y la desventaja en vez de sumar modificadores: es más rápido y se nota igual.
- Para el desafío, la tabla de PX por personaje funciona en los niveles bajos; desde nivel 5 los grupos suelen poder con más de lo que dice.
- La guía rápida de CD: 10 fácil, 15 media, 20 difícil.` },

  /* ---------- 2024 ---------- */
  { ed: "e2024", title: "Qué es", text: `
La revisión de la 5.ª edición: Manual del jugador en septiembre de 2024, Guía del DM en noviembre de 2024 y Manual de monstruos en febrero de 2025. Wizards la presenta como compatible con lo de 2014: las aventuras y los monstruos antiguos siguen sirviendo. El **SRD 5.2** (2025) recoge sus reglas con licencia CC-BY-4.0. En la comunidad se la llama a menudo «5.5» o «D&D 2024».` },
  { ed: "e2024", title: "Lo que cambia al crear personajes", text: `
- **Trasfondo**: da las mejoras de característica (+2 y +1, o +1 a tres, entre las tres que marca), una **dote de origen** y dos habilidades.
- **Especie** (antes raza): no da mejoras de característica. Nuevas en el libro: aasimar, goliat y orco; salen el semielfo y el semiorco.
- **Subclase a nivel 3** para todas las clases.
- **Maestría con armas**: las clases marciales usan una propiedad especial de algunas armas (Hendir, Rozar, Mella, Empujar, Debilitar, Ralentizar, Derribar, Fastidiar).
- **Dones épicos** a nivel 19.
- Muchas clases cambian por dentro: el explorador gira en torno a Marca del cazador, el monje usa «puntos de concentración», el paladín empieza con conjuros a nivel 1, el castigo divino pasa a ser un conjuro.` },
  { ed: "e2024", title: "Lo que cambia en la mesa", text: `
- **Agotamiento**: cada nivel resta 2 a todas las pruebas d20 y 5 pies de velocidad; a nivel 6 mueres. Un descanso largo quita un nivel.
- **Inspiración heroica**: repites un dado. Los humanos la ganan con cada descanso largo.
- **Acciones**: Atacar, Correr, Destrabarse, Esquivar, Ayudar, Ocultarse, Influir, Magia, Preparar, Buscar, Estudiar y Utilizar.
- **Agarrar y empujar** son opciones del golpe sin armas: el objetivo hace una salvación de Fuerza o Destreza (CD 8 + Fuerza + competencia).
- **Sorpresa**: quien es sorprendido tira la iniciativa con desventaja (ya no pierde el turno).
- **Un solo espacio de conjuro por turno.**
- **Descanso largo**: recuperas todos los PV y todos los dados de golpe.
- **Maltrecho** (antes «ensangrentado»): a la mitad de PV o menos; lo usan algunos rasgos.` },
  { ed: "e2024", title: "Mezclar 2014 y 2024", text: `
- Los monstruos y aventuras de 2014 funcionan con personajes de 2024 sin cambios; los personajes de 2024 son algo más fuertes, así que los encuentros pueden necesitar un monstruo más.
- Un personaje de 2014 puede seguir en una mesa de 2024: basta con decidir si usáis las acciones y el agotamiento nuevos para todos.
- En Mesa, el creador de personajes deja elegir 2014 o 2024 en el primer paso.` },

  /* ---------- Reglas rápidas ---------- */
  { ed: "quick", title: "Dificultad de las pruebas", text: `
| CD | Dificultad |
| 5 | Muy fácil |
| 10 | Fácil |
| 15 | Media |
| 20 | Difícil |
| 25 | Muy difícil |
| 30 | Casi imposible |

**Prueba enfrentada**: los dos tiran; gana el más alto y, si empatan, todo sigue como estaba. **Pasiva**: 10 + modificador (+5 con ventaja, −5 con desventaja); la Percepción pasiva es la más usada.` },
  { ed: "quick", title: "Acciones en combate", text: `
En tu turno: moverte hasta tu velocidad, **una acción**, quizá **una acción adicional** (si algo te la da) e interactuar con un objeto gratis. Una **reacción** por asalto.

- **Atacar**: un ataque con un arma o un golpe sin armas (más con Ataque adicional).
- **Correr**: tanto movimiento extra como tu velocidad.
- **Retirarse**: tu movimiento no provoca ataques de oportunidad este turno.
- **Esquivar**: los ataques contra ti tienen desventaja y tienes ventaja en las salvaciones de Destreza (no si estás Incapacitado o tu velocidad es 0).
- **Ayudar**: ventaja a un aliado en su próxima prueba con una habilidad o herramienta que domines, o distraes a un enemigo a 5 pies para que el próximo ataque de un aliado contra él tenga ventaja.
- **Esconderse**: prueba de Destreza (Sigilo) CD 15 fuera de la vista de los enemigos (muy oscuro o con cobertura de tres cuartos o total). Si sale bien, tienes el estado **Invisible** hasta que hagas ruido, ataques o te vean.
- **Influir**: Carisma o Sabiduría para convencer a un monstruo o PNJ.
- **Magia**: lanzar un conjuro, usar un objeto mágico o un rasgo mágico.
- **Preparar**: eliges un desencadenante y una acción (o un conjuro) para hacerla como reacción.
- **Buscar**: una prueba de Sabiduría (Percepción, Perspicacia, Medicina o Supervivencia).
- **Estudiar**: una prueba de Inteligencia (Arcanos, Historia, Investigación, Naturaleza o Religión).
- **Usar**: usar un objeto que no es mágico.

**Ataque de oportunidad**: reacción contra quien sale de tu alcance sin Retirarse. **Luchar con dos armas**: si atacas con un arma ligera, puedes atacar con otra arma ligera como acción adicional, sin sumar tu modificador al daño (con la maestría Mella, ese ataque va dentro de la acción de Atacar).` },
  { ed: "quick", title: "Cobertura, luz y visibilidad", text: `
| Cobertura | Efecto |
| Media | +2 a la CA y a las salvaciones de Destreza |
| Tres cuartos | +5 a la CA y a las salvaciones de Destreza |
| Total | No se le puede apuntar directamente |

- **Luz brillante**: se ve con normalidad.
- **Luz tenue** (ligeramente oscuro): desventaja en las pruebas de Sabiduría (Percepción) que dependen de la vista.
- **Oscuridad** (muy oscuro): no ves nada dentro; en la práctica, tienes el estado Cegado para lo que esté allí.
- **Visión en la oscuridad**: en la oscuridad ve como con luz tenue, y en la luz tenue como con luz brillante, sin colores.
- **Atacar a quien no ves**: desventaja. **Atacar sin ser visto**: ventaja. **Iniciativa**: quien esté Invisible tira con ventaja; quien sea sorprendido, con desventaja.` },
  { ed: "quick", title: "A 0 puntos de golpe", text: `
- A 0 PG caes con el estado **Inconsciente**. Al empezar cada turno haces una **salvación de muerte**: 1d20, **10 o más** es un éxito.
- **Tres éxitos**: quedas estable. **Tres fallos**: mueres.
- **Un 20**: recuperas 1 PG. **Un 1**: cuenta como dos fallos.
- Recibir daño a 0 PG es un fallo (un impacto crítico, dos). Si el daño iguala o supera tus PG máximos, mueres.
- **Daño masivo**: si al llegar a 0 el daño que sobra iguala o supera tus PG máximos, mueres en el acto.
- **Estabilizar**: acción de Ayudar con una prueba de Sabiduría (Medicina) CD 10, o un botiquín de sanador.
- **Maltrecho**: a la mitad de los PG o menos. Algunos rasgos se activan con eso.` },
  { ed: "quick", title: "Concentración", text: `
- Solo un conjuro de concentración a la vez: si lanzas otro, el primero termina.
- Se pierde al quedar **Incapacitado** o al morir.
- Al recibir daño: salvación de Constitución con CD 10 o la mitad del daño (la mayor), como mucho CD 30. Una salvación por cada fuente de daño.` },
  { ed: "quick", title: "Descansos", text: `
| Descanso | Dura | Qué recuperas |
| Corto | 1 hora | Puedes gastar dados de golpe: tiras cada uno y sumas tu Constitución |
| Largo | 8 horas (6 durmiendo) | Todos los PG y todos los dados de golpe; las características reducidas; −1 nivel de agotamiento |

El descanso largo se interrumpe si tiras iniciativa, lanzas un conjuro que no sea un truco, recibes daño o haces una hora de esfuerzo físico (caminar, luchar…). Si llevabas una hora o más, cuenta como un descanso corto. Entre un descanso largo y el siguiente tienen que pasar al menos 16 horas.` },
  { ed: "quick", title: "Agotamiento", text: `
Cada nivel de **Agotamiento** resta **2 a todas las pruebas de d20** (ataques, salvaciones y pruebas de característica) y **5 pies a la velocidad**, acumulándose. A nivel 6, mueres. Un descanso largo quita un nivel.

| Nivel | Pruebas de d20 | Velocidad |
| 1 | −2 | −5 pies |
| 2 | −4 | −10 pies |
| 3 | −6 | −15 pies |
| 4 | −8 | −20 pies |
| 5 | −10 | −25 pies |
| 6 | Muerte | — |` },
  { ed: "quick", title: "Estados", text: `
Los quince estados de la 5.5, con su texto completo y el icono con el que salen en el mapa, están en la página **Estados** del índice. En Mesa se ponen y se quitan desde el bocadillo de cada ficha del mapa.` },
  { ed: "quick", title: "Agarrar y empujar", text: `
Son opciones del **golpe sin armas** (en vez de hacer daño). El objetivo no puede ser más de una talla mayor que tú y tiene que estar a tu alcance.

- **Agarrar**: el objetivo hace una salvación de Fuerza o Destreza (la que prefiera) con **CD 8 + tu modificador de Fuerza + tu bonificador por competencia**. Si falla, tiene el estado **Agarrado**: velocidad 0 y desventaja al atacar a cualquiera que no seas tú. Necesitas una mano libre y moverte con él te cuesta el doble (salvo que sea dos tallas menor).
- **Escapar**: como acción, prueba de Fuerza (Atletismo) o Destreza (Acrobacias) contra esa misma CD.
- **Empujar**: misma salvación; si falla, lo apartas 5 pies o lo dejas **Derribado**.` },
  { ed: "quick", title: "Viajes y movimiento", text: `
| Ritmo | Por minuto | Por hora | Por día | Efecto |
| Rápido | 400 pies | 4 millas | 30 millas | Desventaja en Percepción, Supervivencia y Sigilo |
| Normal | 300 pies | 3 millas | 24 millas | Desventaja en Sigilo |
| Lento | 200 pies | 2 millas | 18 millas | Ventaja en Percepción y Supervivencia |

- **Terreno difícil**: cada pie cuesta uno más.
- **Saltar**: de longitud, tu puntuación de Fuerza en pies con 10 pies de carrerilla (la mitad sin ella); de altura, 3 + tu modificador de Fuerza.
- **Caer**: 1d6 de daño contundente por cada 10 pies, hasta 20d6, y quedas Derribado.
- **Contener la respiración**: 1 + tu modificador de Constitución minutos (mínimo 30 segundos); sin aire, ganas un nivel de agotamiento al final de cada turno.
- **Trepar, nadar y arrastrarse**: cada pie cuesta uno más (salvo con velocidad de trepar o nadar).` },
  { ed: "quick", title: "Conjuros", text: `
- **Un solo espacio de conjuro por turno**; los trucos no gastan espacio.
- **Componentes**: verbal (V), somático (S) y material (M). Un canalizador sustituye los materiales que no tienen coste ni se gastan.
- **Nivel superior**: lanzarlo con un espacio más alto lo potencia, si el conjuro lo dice.
- **Ritual**: 10 minutos más y no gasta espacio, si el conjuro tiene la etiqueta y tu clase lo permite.
- **CD de salvación** = 8 + bonificador por competencia + modificador de la característica. **Ataque de conjuro** = competencia + característica.
- **Lanzar con armadura** sin dominarla: no se puede.` },
  { ed: "quick", title: "Subir de nivel", text: `
| Nivel | PX | Competencia |
| 1 | 0 | +2 |
| 2 | 300 | +2 |
| 3 | 900 | +2 |
| 4 | 2.700 | +2 |
| 5 | 6.500 | +3 |
| 6 | 14.000 | +3 |
| 7 | 23.000 | +3 |
| 8 | 34.000 | +3 |
| 9 | 48.000 | +4 |
| 10 | 64.000 | +4 |
| 11 | 85.000 | +4 |
| 12 | 100.000 | +4 |
| 13 | 120.000 | +5 |
| 14 | 140.000 | +5 |
| 15 | 165.000 | +5 |
| 16 | 195.000 | +5 |
| 17 | 225.000 | +6 |
| 18 | 265.000 | +6 |
| 19 | 305.000 | +6 |
| 20 | 355.000 | +6 |

Todas las clases eligen subclase a nivel 3. Mejoras de característica (o una dote) a niveles 4, 8, 12 y 16, y un don épico a nivel 19. En Mesa, «Subir de nivel» en la ficha abre el creador donde se dejó.` },
  { ed: "quick", title: "Preparar encuentros", text: `
Suma el presupuesto de PX de cada personaje según su nivel y la dificultad que quieras, y gástalo en monstruos (cada uno cuesta sus PX, sin multiplicadores por número).

| Nivel | Baja | Moderada | Alta |
| 1 | 50 | 75 | 100 |
| 2 | 100 | 150 | 200 |
| 3 | 150 | 225 | 400 |
| 4 | 250 | 375 | 500 |
| 5 | 500 | 750 | 1.100 |
| 6 | 600 | 1.000 | 1.400 |
| 7 | 750 | 1.300 | 1.700 |
| 8 | 1.000 | 1.700 | 2.100 |
| 9 | 1.300 | 2.000 | 2.600 |
| 10 | 1.600 | 2.300 | 3.100 |
| 11 | 1.900 | 2.900 | 4.100 |
| 12 | 2.200 | 3.700 | 4.700 |
| 13 | 2.600 | 4.200 | 5.400 |
| 14 | 2.900 | 4.900 | 6.200 |
| 15 | 3.300 | 5.400 | 7.800 |
| 16 | 3.800 | 6.100 | 9.800 |
| 17 | 4.500 | 7.200 | 11.700 |
| 18 | 5.000 | 8.700 | 14.200 |
| 19 | 5.500 | 10.700 | 17.200 |
| 20 | 6.400 | 13.200 | 22.000 |

- Ejemplo: cuatro personajes de nivel 3 en un encuentro moderado tienen 4 × 225 = 900 PX. Un ogro (VD 2, 450 PX) y cuatro lobos (VD 1/4, 50 PX cada uno) gastan 650; con un oso pardo (VD 1, 200 PX) llegas a 850.
- Más enemigos débiles reparten el daño; un monstruo solo cae rápido si no tiene acciones legendarias.
- Varía el terreno: cobertura, alturas, terreno difícil y algo que hacer aparte de pegar. Las fichas completas están en **Criaturas**.` },

  /* ---------- Comparativa ---------- */
  { ed: "compare", title: "Cómo se resuelve cada cosa", text: `
| | OD&D / Básico | AD&D 1.ª y 2.ª | 3.ª / 3.5 | 4.ª | 5.ª (2014 y 2024) |
| Ataque | Tabla por nivel | Matrices; THAC0 en 2.ª | d20 + ataque base vs CA | d20 + ½ nivel + mod. vs defensa | d20 + competencia + mod. vs CA |
| CA | Descendente | Descendente | Ascendente | Ascendente | Ascendente |
| Salvaciones | 5 categorías | 5 categorías | Fortaleza, Reflejos, Voluntad | Defensas + salvación 10+ | Una por característica |
| Características | Influyen poco | Más peso; Fuerza excepcional | Modificador (car−10)/2 | Igual | Igual |
| Habilidades | No | Competencias (opcional en 2.ª) | Rangos | Entrenada o no | Competencia y pericia |
| Talentos | No | Kits (2.ª) | Dotes | Dotes y poderes | Dotes (opcionales en 2014; de origen en 2024) |
| Razas | Raza como clase (Básico) | Con límites de nivel | Sin límites | Sin límites | Sin límites |
| Curación | Lenta | Lenta | Lenta, mucha magia | Recuperaciones | Dados de golpe y descansos |
| Niveles | 1–14 (B/X), 1–36 (BECMI) | Sin tope formal | 1–20 (y épico) | 1–30 | 1–20 |
| Licencia abierta | No | No | OGL (SRD 3.5) | GSL (cerrada) | SRD 5.1 y 5.2, CC-BY-4.0 |` },
  { ed: "compare", title: "Convertir números a la 5.ª", text: `
- **CA descendente a ascendente**: 19 − CA. (CA 5 → 14; CA 0 → 19; CA −2 → 21, que en 5.ª se deja en 20 o menos).
- **THAC0 a bonificador**: 20 − THAC0, y luego bájalo hasta lo que tendría un monstruo de 5.ª de ese desafío (+3 a +5 en niveles bajos, +7 a +9 en medios).
- **Salvaciones antiguas a CD**: CD ≈ 10 + la mitad de los dados de golpe del monstruo.
- **Movimiento**: 12" o 120 pies de las ediciones antiguas → 30 pies; 9" → 25 o 20 pies; 6" → 15 o 20 pies.
- **Monedas**: la 1.ª y la 2.ª daban mucho más oro (servía de experiencia). Divide los tesoros entre 5 o 10.
- **Desafío**: los dados de golpe de un monstruo antiguo son una buena primera idea de su VD en 5.ª; luego ajusta por lo que hace.` },

  /* ---------- Créditos ---------- */
  { ed: "credits", title: "De dónde sale esto", text: `
**Dungeons & Dragons**, **D&D** y los nombres de sus productos son marcas de Wizards of the Coast LLC. Mesa no está afiliado a Wizards of the Coast ni cuenta con su aprobación.

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Este trabajo incluye material del **System Reference Document 5.2** («SRD 5.2») y del **System Reference Document 5.1** («SRD 5.1») de Wizards of the Coast LLC, disponibles en https://www.dndbeyond.com/srd, con licencia Creative Commons Attribution 4.0 International (CC-BY-4.0).` },
  { ed: "credits", title: "Qué se ha cambiado", text: `
- El **reglamento, los estados, los conjuros, las armas y armaduras, las especies y las criaturas** de la 5.5 son el SRD 5.2 **traducido al castellano** para Mesa. No es la traducción oficial de Wizards: los nombres siguen los de los manuales en español cuando se conocen, y los términos de juego se han unificado con los del resto de Mesa (por ejemplo, «DM»).
- El texto en inglés se ha tomado de los datos del SRD 5.2 que publica **Open5e** (https://github.com/open5e/open5e-api), y los conjuros a los que les faltaban párrafos se han completado con los del sistema **dnd5e de Foundry VTT** (https://github.com/foundryvtt/dnd5e, CC-BY-4.0 en su contenido del SRD). Se han corregido algunas erratas de esos datos.
- La **chuleta**, la guía y los resúmenes de las ediciones anteriores están escritos con palabras propias, para consulta en la mesa.
- Para las ediciones anteriores a la 5.ª solo hay descripciones generales de cómo funcionan; para jugarlas hacen falta sus libros, que Wizards sigue vendiendo en PDF e impresión bajo demanda.` }
];
