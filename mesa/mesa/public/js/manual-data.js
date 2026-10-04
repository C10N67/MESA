/* Mesa · el manual del DM

   Un resumen de cada edición de Dungeons & Dragons, de 1974 a la revisión de
   2024, y una chuleta de las reglas de la 5.ª edición para tenerla a mano
   durante la partida. Está escrito aquí, con palabras propias: no copia los
   manuales oficiales. Las reglas de la 5.ª salen del documento de referencia
   (SRD 5.1 y SRD 5.2), que Wizards of the Coast publica con licencia
   Creative Commons CC-BY-4.0.

   Formato del texto, para no cargar con un intérprete de Markdown entero:
     línea en blanco      párrafo nuevo
     «- » al empezar       lista
     «| a | b |»           fila de tabla (la primera, cabecera)
     «## título»           subtítulo
     **negrita**
   Todo se escapa antes de pintarlo. */

export const EDITIONS = [
  { id: "intro", short: "Guía", name: "Cómo leer este manual" },
  { id: "odd", short: "OD&D", name: "Dungeons & Dragons original (1974)" },
  { id: "basic", short: "Basic", name: "D&D Básico: Holmes, B/X, BECMI y Rules Cyclopedia (1977–1991)" },
  { id: "add1", short: "AD&D 1.ª", name: "Advanced Dungeons & Dragons, 1.ª edición (1977–1979)" },
  { id: "add2", short: "AD&D 2.ª", name: "Advanced Dungeons & Dragons, 2.ª edición (1989)" },
  { id: "e3", short: "3.0 / 3.5", name: "D&D 3.ª edición y 3.5 (2000 y 2003)" },
  { id: "e4", short: "4.ª", name: "D&D 4.ª edición (2008)" },
  { id: "e5", short: "5.ª (2014)", name: "D&D 5.ª edición (2014)" },
  { id: "e2024", short: "2024", name: "D&D, revisión de 2024 (la «5.5»)" },
  { id: "quick", short: "Reglas rápidas", name: "Reglas rápidas de la 5.ª (2014 y 2024)" },
  { id: "compare", short: "Comparativa", name: "Las ediciones, cara a cara" },
  { id: "credits", short: "Créditos", name: "Fuentes y licencias" }
];

export const SECTIONS = [
  /* ---------- Guía ---------- */
  { ed: "intro", title: "Para qué sirve", text: `
Un manual de consulta rápida para el DM: qué trae cada edición de D&D, cómo se resuelven las cosas en cada una y una chuleta de la 5.ª para no tener que abrir el libro en mitad del combate.

No sustituye a los libros. Resume con palabras propias lo que hace falta para entender, dirigir o adaptar cada edición; los manuales originales tienen mucho más (tablas completas, monstruos, objetos, ambientación).

Usa el buscador de arriba: busca «salvación», «THAC0», «agarrar», «agotamiento»… y salen las secciones de todas las ediciones donde aparece.` },
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

Es la edición para la que está hecha Mesa: la ficha, los ataques, los conjuros, los estados y el bestiario siguen sus reglas.` },
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
- **Ensangrentado**: a la mitad de PV o menos; lo usan algunos rasgos.` },
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
- **Atacar**: un ataque (más con Ataque adicional).
- **Lanzar un conjuro** (2024: **Magia**, que también cubre usar objetos mágicos).
- **Correr**: el doble de movimiento.
- **Destrabarse**: tu movimiento no provoca ataques de oportunidad.
- **Esquivar**: los ataques contra ti tienen desventaja y tienes ventaja en salvaciones de Destreza.
- **Ayudar**: ventaja a un aliado en una prueba o en su próximo ataque.
- **Ocultarse**: prueba de Destreza (Sigilo).
- **Preparar**: eliges un disparador y una acción para usarla como reacción.
- **Buscar**: prueba de Sabiduría (Percepción o Perspicacia…).
- **Usar un objeto** (2024: **Utilizar**).
- Solo 2024: **Influir** (pruebas sociales) y **Estudiar** (pruebas de Inteligencia).

**Ataque de oportunidad**: reacción cuando alguien sale de tu alcance sin destrabarse. **Lucha con dos armas** (2014): con dos armas ligeras, la segunda ataca como acción adicional sin sumar el modificador al daño.` },
  { ed: "quick", title: "Cobertura, luz y visibilidad", text: `
| Cobertura | Efecto |
| Media | +2 a la CA y a las salvaciones de Destreza |
| Tres cuartos | +5 a la CA y a las salvaciones de Destreza |
| Total | No se le puede apuntar directamente |

- **Luz brillante**: se ve con normalidad.
- **Penumbra** (ligeramente oscuro): desventaja en Percepción con la vista.
- **Oscuridad** (muy oscuro): como estar cegado para lo que esté dentro.
- **Visión en la oscuridad**: ve en la oscuridad como en penumbra y en la penumbra como con luz, sin colores.
- **Atacar a quien no ves**: con desventaja; **atacar sin ser visto**: con ventaja.` },
  { ed: "quick", title: "Salvaciones de muerte y daño masivo", text: `
- A 0 PV caes inconsciente. Al empezar tu turno tiras 1d20: **10 o más** es un éxito, menos es un fallo.
- **Tres éxitos**: estable. **Tres fallos**: muerto.
- **Un 20**: recuperas 1 PV. **Un 1**: cuenta como dos fallos.
- Recibir daño a 0 PV es un fallo (un crítico, dos).
- **Daño masivo**: si el daño que sobra al llegar a 0 iguala o supera tus PV máximos, mueres en el acto.
- Estabilizar: acción con una prueba de Sabiduría (Medicina) CD 10, o un botiquín de sanador.` },
  { ed: "quick", title: "Concentración", text: `
- Solo un conjuro de concentración a la vez.
- Se pierde al lanzar otro de concentración, al quedar incapacitado o al morir.
- Al recibir daño: salvación de Constitución con CD 10 o la mitad del daño, la mayor (en 2024, como mucho CD 30). Cada fuente de daño, una salvación.` },
  { ed: "quick", title: "Descansos", text: `
| | 2014 | 2024 |
| Descanso corto | 1 hora; gastas dados de golpe para curarte | Igual |
| Descanso largo | 8 horas (6 durmiendo); todos los PV y la mitad de los dados de golpe; −1 al agotamiento si has comido y bebido | 8 horas; todos los PV y todos los dados de golpe; −1 al agotamiento |

Un descanso largo, como mucho uno cada 24 horas. Se interrumpe con una hora de actividad intensa (combate, caminar, lanzar conjuros).` },
  { ed: "quick", title: "Agotamiento", text: `
**2014**, efectos que se acumulan:

| Nivel | Efecto |
| 1 | Desventaja en las pruebas de característica |
| 2 | Velocidad a la mitad |
| 3 | Desventaja en ataques y salvaciones |
| 4 | PV máximos a la mitad |
| 5 | Velocidad 0 |
| 6 | Muerte |

**2024**: cada nivel, −2 a todas las pruebas d20 y −5 pies de velocidad. A nivel 6, muerte. Un descanso largo quita un nivel.` },
  { ed: "quick", title: "Estados", conditions: true, text: `
Los estados de la mesa, tal como los aplica Mesa en la ficha. En 2024 cambian algunos detalles (por ejemplo, invisible también da ventaja a la iniciativa y agotamiento funciona como arriba).` },
  { ed: "quick", title: "Agarrar y empujar", text: `
- **2014**: en lugar de un ataque, prueba de Fuerza (Atletismo) contra Fuerza (Atletismo) o Destreza (Acrobacias) del objetivo. Agarrado: velocidad 0. Empujar: lo derribas o lo apartas 5 pies.
- **2024**: es una opción del golpe sin armas. El objetivo hace una salvación de Fuerza o Destreza (la que prefiera) con CD 8 + tu Fuerza + tu competencia.
- Liberarse: acción y prueba de Atletismo o Acrobacias contra la CD del agarre (2024) o contra tu Atletismo (2014).
- El objetivo no puede ser más de una talla mayor que tú.` },
  { ed: "quick", title: "Viajes y movimiento", text: `
| Ritmo | Por minuto | Por hora | Por día | Efecto |
| Rápido | 400 pies | 4 millas | 30 millas | −5 a la Percepción pasiva |
| Normal | 300 pies | 3 millas | 24 millas | — |
| Lento | 200 pies | 2 millas | 18 millas | Puede ir con sigilo |

- **Terreno difícil**: cada pie cuesta dos.
- **Saltar**: de longitud, tu Fuerza en pies con carrerilla de 10 (la mitad sin ella); de altura, 3 + tu modificador de Fuerza.
- **Caer**: 1d6 contundente por cada 10 pies, hasta 20d6. Quedas derribado.
- **Contener la respiración**: 1 + modificador de Constitución minutos (mínimo 30 segundos).
- **Carga**: tu Fuerza × 15 libras; empujar, arrastrar o levantar, el doble.` },
  { ed: "quick", title: "Conjuros", text: `
- **Componentes**: verbal (V), somático (S) y material (M). Un canalizador sustituye los materiales sin coste.
- **Subir de nivel**: un espacio más alto potencia muchos conjuros.
- **Ritual**: 10 minutos más y no gasta espacio, si el conjuro lo permite y tu clase lo deja.
- **Un espacio por turno** (2024). En 2014: si lanzas uno como acción adicional, en ese turno solo puedes lanzar además un truco de 1 acción.
- **CD de salvación** = 8 + competencia + característica. **Ataque de conjuro** = competencia + característica.` },
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

Muchas mesas suben por hitos de la historia en vez de por PX. En Mesa, «Subir de nivel» en la ficha abre el creador donde se dejó.` },
  { ed: "quick", title: "Preparar encuentros", text: `
- **2014**: suma los umbrales de PX de los personajes (fácil, media, difícil, mortal), suma los PX de los monstruos y multiplica según cuántos sean (×1,5 con dos, ×2 de tres a seis…). Mesa hace esta cuenta sola en la pestaña de la mesa.
- **2024**: un presupuesto de PX por personaje según el nivel y la dificultad (baja, moderada o alta), sin multiplicador por número de monstruos.
- Más enemigos débiles reparten el daño; un solo monstruo grande cae rápido si no tiene acciones legendarias.
- Varía el terreno: cobertura, alturas, terreno difícil y algo que hacer aparte de pegar.` },

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
Este manual y el creador de personajes resumen y explican las reglas con palabras propias, para consulta en la mesa. No reproducen el texto de los libros.

**Dungeons & Dragons**, **D&D** y los nombres de sus productos son marcas de Wizards of the Coast LLC. Mesa no está afiliado a Wizards of the Coast ni cuenta con su aprobación.

Este trabajo incluye material del **System Reference Document 5.1** («SRD 5.1») y del **System Reference Document 5.2** («SRD 5.2») de Wizards of the Coast LLC, disponibles en https://www.dndbeyond.com/srd. Los SRD 5.1 y 5.2 se publican con licencia Creative Commons Attribution 4.0 International, CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). Las reglas se han resumido y traducido al español.

Para las ediciones anteriores a la 5.ª, solo hay descripciones generales de cómo funcionan; para jugarlas hacen falta sus libros, que Wizards sigue vendiendo en PDF e impresión bajo demanda.` }
];
