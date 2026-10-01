# Mesa

Partida de D&D en red. Tú llevas la partida desde el ordenador y cada jugador
abre la suya en el móvil: su ficha, sus dados y el trozo de mazmorra que su
personaje alcanza a ver. En la tele puedes poner una tercera pantalla con el
mapa y los turnos.

No necesita instalar nada más que Node.js, no tiene dependencias y funciona sin
internet: basta con que todos estéis en el mismo wifi.

## Arrancarla

1. Instala **Node.js** una vez, desde <https://nodejs.org> (opción LTS).
2. Doble clic en `Abrir Mesa (Windows).bat` o en `Abrir Mesa (Mac y Linux).command`.
   Desde una terminal es `npm start`.

La ventana que se abre te dice tres cosas:

```
Tú (DM)        http://localhost:8080
Tus jugadores  http://192.168.1.34:8080
Código del DM  4821
```

Tú entras por la primera dirección y eliges «DM» con ese código. Tus jugadores
abren la segunda en su móvil, eligen «Jugador» y se quedan con su personaje.
La tele o el proyector entran por la misma dirección y eligen «Pantalla».

Esa ventana tiene que quedarse abierta mientras jugáis: es el servidor.

### Jugar sin estar en la misma casa

Mesa habla HTTP normal, así que sirve cualquier túnel. Con
[Tailscale](https://tailscale.com) instalado en tu ordenador y en el de tus
jugadores, la dirección de tu máquina en la red privada funciona tal cual. Otra
opción de un solo comando, mientras dure la sesión:

```bash
npx localtunnel --port 8080     # o: cloudflared tunnel --url http://localhost:8080
```

Reparte esa URL y el código del DM solo a tu grupo: quien tenga la dirección
puede entrar como jugador.

## Instalar como aplicación

Mesa es una **aplicación web instalable** (PWA): se abre en su propia ventana,
sin barra del navegador, con su icono en el escritorio o en la pantalla de
inicio, y con accesos directos a **DM**, **Jugador** y **Pantalla** (clic
derecho o pulsación larga en el icono).

- **En el ordenador del DM** (Chrome o Edge), entrando por
  `http://localhost:8080`: icono de instalar en la barra de direcciones, o el
  botón **Instalar Mesa como aplicación** de la pantalla de entrada.
- **En Android**: menú ⋮ → *Instalar aplicación*.
- **En iPhone y iPad** (Safari): *Compartir* → *Añadir a pantalla de inicio*.

**Lo que hay que saber:** los navegadores solo dejan instalar una aplicación
desde `localhost` o por **HTTPS**. Desde el ordenador donde corre Mesa funciona
tal cual; en los móviles, con `http://192.168.x.x` se puede jugar igual de
bien, pero no instalar. Tres formas de tener HTTPS, de menos a más trabajo:

1. **Tailscale** (recomendado si ya lo usáis, con HTTPS activado en su consola): `tailscale serve --bg 8080`
   publica Mesa en `https://tu-maquina.tu-red.ts.net` con certificado válido,
   solo para tu red privada.
2. **Un túnel** de un comando: `cloudflared tunnel --url http://localhost:8080`
   da una dirección `https://…trycloudflare.com` mientras dure la sesión.
3. **Certificado propio** con [mkcert](https://github.com/FiloSottile/mkcert):

   ```bash
   mkcert -install
   mkcert 192.168.1.34 localhost        # la IP que te da la ventana de Mesa
   node server.js --cert 192.168.1.34+1.pem --key 192.168.1.34+1-key.pem
   ```

   Cada móvil tiene que confiar en la autoridad de mkcert una vez (el archivo
   `rootCA.pem` que indica `mkcert -CAROOT`). También vale con las variables
   `MESA_CERT` y `MESA_KEY`.

Instalada o no, la partida vive en el servidor: la aplicación guarda solo el
código y las imágenes (planos y retratos no se vuelven a descargar), nunca el
estado. Si el servidor no está en marcha, la entrada lo dice en vez de quedarse
en blanco.

## Idioma

Arriba a la derecha (o en **⋯ → Idioma**, y en la propia pantalla de entrada)
se elige entre **español** e **inglés**, y cada persona lo elige para su
aparato: el DM puede tenerlo en español y un jugador en inglés en la misma
partida. Al cambiarlo, la página se recarga sola y no se pierde nada.

El inglés se aplica sobre la interfaz ya escrita en español, con un
diccionario. Se traducen los botones, los rótulos, los avisos, las pistas de las
herramientas, los dieciséis estados con su explicación, las dieciocho
habilidades, lo que escribe el programa en el registro y **el bestiario que
viene de fábrica**, con sus trece criaturas, sus fichas técnicas, sus rasgos y
sus ataques ("Cimitarra — +4 al ataque — 1d6+2 cortante" sale como "Scimitar —
+4 to hit — 1d6+2 slashing"). Lo que escribís vosotros no se toca: los
nombres de los personajes, la charla, tus notas y las criaturas que te inventes
se quedan tal cual, que es como tiene que ser.

## En el teléfono

Los jugadores juegan desde el móvil, así que la aplicación está pensada para
eso y no solo adaptada:

- Las ventanas (crear personaje, editar la ficha, estados) suben desde abajo
  como una hoja, con **guardar y cancelar pegados al borde inferior** y siempre
  a la vista por larga que sea la ficha. Se mide con la altura real del
  navegador, no con la nominal, que es lo que dejaba los botones fuera de
  pantalla cuando la barra de direcciones ocupaba su sitio.
- En el mapa, **un dedo arrastra el plano** y un toque mueve tu ficha; dos
  dedos acercan, alejan y desplazan a la vez. Con zoom ya se puede recorrer el
  plano para ver el detalle.
- Los botones tienen tamaño de dedo, los campos usan cuerpo 16 para que iOS no
  haga zoom solo al escribir, y se respeta la franja inferior del iPhone.
- La barra de herramientas del mapa rueda de lado en vez de comerse el tablero.

## Las tres vistas

| | DM | Jugador | Pantalla |
|---|---|---|---|
| Personajes | ficha completa de todos | la suya entera, del resto vida y CA | nombre, vida y estados |
| Enemigos | todo: PV, CA, rasgos, acciones | nombre y estado aparente | nombre y estado aparente |
| Vida del enemigo | números exactos | «Herido», «Malherido»… y el daño hecho | igual que el jugador |
| Mapa | entero, editable | solo lo que ve su party | lo mismo, en grande |
| Bestiario y notas | sí | nunca | nunca |
| Dados | tira y puede tirar en secreto | tira, y todos lo ven | enseña la última tirada |

**Lo que no se enseña no viaja.** El servidor recorta el estado antes de
mandarlo: un monstruo escondido, los rasgos de una criatura o el trozo de mapa
sin explorar no llegan al navegador del jugador, así que no hay nada que
descubrir mirando el inspector del navegador. Es la diferencia de fondo con una
proyección compartida.

## La mesa

Cada personaje tiene su tarjeta con vida, CA, estados y, al desplegarla,
características, salvaciones, habilidades, espacios de conjuro, recursos
propios y sus notas. Los botones **−** y **+** con la casilla del medio aplican
daño y curación; `Intro` aplica daño y `Mayús + Intro`, curación. La vida
temporal se descuenta antes que la de verdad y el aviso de concentración salta
solo, con la CD ya calculada.

Los estados son los del reglamento, con su explicación al pasar el ratón, y se
quitan pulsando la etiqueta. El agotamiento va aparte, por niveles.

Cada estado deja **su marca en la ficha del mapa**: un ojo tachado para cegado,
una red para apresado, una gota para envenenado, un rayo para paralizado. Caben
tres chapitas en arco sobre la ficha y, si hay más, la última dice cuántas
faltan, porque cinco marcas diminutas no se distinguen desde el otro lado de la
mesa.

Cada estado puede llevar **una duración en rondas**: al cerrarse el turno de
quien lo sufre, la cuenta baja sola y el estado se cae solo cuando toca, con
aviso en el registro. El agotamiento va aparte, por niveles.

**Descansar** abre las dos opciones. El **largo** devuelve vida, espacios,
recursos y la mitad de los dados de vida, y baja un nivel de agotamiento. En el
**corto**, cada personaje gasta sus dados de golpe desde su propia ficha (tira
el dado, suma Constitución y se cura). A los monstruos no les afecta ninguno.

El botón **↶** (o `Ctrl/Cmd + Z`) deshace el último cambio. Se guardan los
veinte últimos, así que un daño mal apuntado o un borrado por error se arreglan
en un segundo.

## Combate

**Iniciar combate** monta el orden con las iniciativas que ya haya.
**Tirar iniciativa** las tira todas de golpe (las de los monstruos, en secreto)
y reordena. Cada jugador puede tirar la suya desde su móvil.

Al empezar un combate, Mesa propone quién entra y te deja retocarlo antes de
arrancar. No entra todo el que esté en el mapa: se quedan fuera los que están a
0 puntos de vida, las criaturas que **la party todavía no ha visto** (meterlas
delataría que hay algo ahí) y las que están a más de doce casillas de la pelea.
De cada uno se dice por qué está dentro o fuera, y se marca o desmarca a mano.

La **iniciativa se escribe a mano** en la misma ventana, en la casilla de cada
uno. Si prefieres tirarla, hay un dado por fila, un botón para tirar por todos y
otro para tirar solo por las criaturas (en secreto, como siempre). Lo que
escribas manda sobre lo que tuvieran guardado.

La barra de arriba enseña la ronda, quién actúa y quién sigue; se puede saltar a
cualquiera pulsándolo, **reordenar la iniciativa arrastrando**, meter a alguien
que llega tarde con **Añadir…**, **sacarlo** con la equis de su turno y
**Retrasar** el turno del que quiere esperar.
`Barra espaciadora` o `Intro` pasan turno.

Debajo del turno actual están sus recursos del asalto: **acción**, **adicional**
y **reacción** se marcan al gastarlas, y al lado va el movimiento que le queda
de su velocidad, que se descuenta solo según arrastras su ficha por el mapa. Al
empezar su siguiente turno vuelve todo a cero.

Los que están a 0 PV se saltan solos en el orden (los monstruos; a los
personajes se les da su turno para las salvaciones de muerte).

### Ataques

Cada ficha tiene su botón **Atacar**. La lista sale de dos sitios: los ataques
que apuntes en la ficha y los que Mesa **lee de las acciones de la criatura**,
que vienen escritos en prosa en el bestiario ("Cimitarra. Ataque con arma cuerpo
a cuerpo: +4 al ataque… Impacto: 5 (1d6+2) de daño cortante"). De ahí saca el
bonificador, el daño y el tipo.

Cada ataque puede llevar además **un nivel de conjuro** y **una forma de área**
(esfera, cono, línea o cubo, con su tamaño en pies). Con nivel, al lanzarlo se
gasta un espacio de ese nivel y, si no te quedan, no te deja lanzarlo. Con
forma, aparece en «Mis áreas» del mapa.

Eliges objetivo, ventaja o desventaja y ya: se tira el ataque, se compara con la
CA, un 20 natural duplica los dados de daño y el daño se resta de la ficha del
objetivo. Todo queda en el registro con los dados a la vista.

**La tirada la hace el servidor, no tu navegador.** Es lo que permite que un
jugador ataque a un monstruo sin saber su CA y sin poder decidir por su cuenta
que ha impactado. Los ataques con salvación ("CD 13 de Destreza") también se
reconocen y se anuncian con su CD.

El resumen de encuentro calcula los PX ajustados por número de criaturas y los
compara con el presupuesto de la party, así que ves si el combate es fácil,
medio, difícil o mortal antes de que empiece.

## Bestiario

Cada criatura puede llevar **su retrato**, igual que un personaje: se sube una
vez en el bestiario y todas las que invoques salen ya con esa cara, en la
tarjeta y en su ficha del mapa. El tamaño también viaja, así que un ogro
guardado como «Grande» ocupa 2×2 en cuanto lo pones en el tablero.

Trece criaturas listas (goblin, kobold, bandido, guardia, lobo, esqueleto,
zombi, orco, trasgo, araña gigante, oso pardo, osgo y ogro), buscables, con
cantidad y **PV al azar** para que dos goblins no aguanten lo mismo. Entran al
encuentro numerados (Goblin 1, Goblin 2…) y con su iniciativa tirada.

Puedes editar cualquiera y crear las tuyas; las propias se pueden borrar y las
básicas no. El ojo (👁) de cada ficha ya en la mesa la oculta por completo de
las otras dos vistas, para emboscadas.

## Mapa

Cada mapa tiene su imagen de fondo, su cuadrícula, sus muros y su niebla. Al
cargar una imagen, las filas se ajustan solas a su proporción para que el plano
no salga deformado.

- **Fichas** arrastra por las casillas. Al arrastrar se pinta **hasta dónde
  llega** con la velocidad que le quede, rodeando muros, y un contador dice
  cuántos pies lleva. Un recuadro sobre el tablero **elige varias** y las mueve
  juntas guardando la formación; `Mayús` + clic añade o quita de la selección.
- **Regla** mide entre dos casillas en pies y en casillas, con la regla del
  manual o la variante 5-10-5, la que elijas en los ajustes.
- **Plantillas**: círculo, cono, línea y cuadrado. Al elegir una se pega al
  cursor y va contigo por el tablero; un clic la deja fija donde estés, y si
  arrastras antes de soltar, la giras. Para moverla, vuelve a pulsar su botón.
  Se ven en la mesa y en los móviles, y se quitan todas con la ✕.
- **Niebla**, **Oscuridad** y **Luz** son pinceles de casilla. Ver más abajo.
- **Muro** pinta paredes sobre los bordes; se puede arrastrar para trazar un tramo.
- **Puerta** pone una puerta cerrada; púlsala otra vez y queda abierta. Cerrada
  corta la visión, abierta la deja pasar.
- **Borrar** quita muros y puertas.
- **Nota** clava una chincheta con texto y tipo (nota, peligro, tesoro, algo
  raro). Por defecto solo la ves tú, y se dibuja en morado con el borde a
  rayas; las que ve la party van en ámbar. **Cuando un personaje pisa la
  casilla te salta el aviso con la nota**, la vea la party o no, y si era
  secreta tienes ahí mismo el botón para enseñársela. Las marcadas para la
  party no aparecen hasta que alguien las **tiene a la vista por primera vez**;
  a partir de ahí se quedan en el mapa si está activo «recordar lo explorado»,
  y si no, solo mientras las estén viendo. Tú las ves todas siempre.
- **Acceso** pone una escalera o un portal a otro mapa: quien la pisa cruza, y
  la mesa entera cambia de plano con él.
- Pulsa una casilla vacía para **colocar** ahí a quien todavía no esté en el
  tablero; pulsa una ficha para su menú (apuntar, atacar, estados, sacarla).
- `Alt` + clic **señala** un punto: sale un círculo animado en la pantalla de
  todos. Los jugadores tienen su propio botón «Señalar».
- Botón derecho (o `Mayús` + arrastrar) mueve la vista; `Ctrl` + rueda hace
  zoom. En el móvil se hace con dos dedos.

La niebla es de verdad: cada personaje ilumina un radio de casillas y **los
muros y las puertas cerradas cortan la línea de visión**. Con **recordar lo
explorado** activado, todo lo que la party ha llegado a ver se queda dibujado
el resto de la partida, con un velo muy leve encima para distinguir lo que
están viendo ahora de lo que solo recuerdan. El plano se va destapando solo a
medida que caminan.

La memoria vale también para los enemigos: una criatura que hayan visto se
queda dibujada, apagada y con el borde a rayas, **en el sitio donde la vieron**.
No se mueve sola, porque lo que la party recuerda es dónde estaba. **En cuanto
vuelven a mirar esa casilla y la ven vacía, la marca se cae**: ya saben que se
ha movido, dejársela ahí sería engañarles. Cuando vuelven a tenerla delante, se
actualiza. En su lista aparecen aparte, bajo «Vistos antes». Si apagas
«recordar lo explorado», no se recuerda nada ni de mapa ni de enemigos.

Lo que **no** saben nunca, salvo que tú lo abras, es cuánta vida le queda a un
enemigo: ni el aro del mapa, ni la etiqueta de herida, ni el daño acumulado.
El dato ni siquiera viaja a su navegador. Está en los ajustes del mapa y en el
panel de la pantalla, por si en tu mesa preferís jugar con las cifras a la
vista.

Una criatura **no existe para la party hasta que alguien la ve**. Sacarla del
bestiario no la enseña, y colocarla al otro lado del mapa tampoco: aparece en
su lista y en su mapa cuando entra en el campo de visión de alguno. Si después
se esconde tras una esquina, desaparece otra vez; lo único que se queda es su
sitio en la iniciativa, si ya estaban peleando.

### Lo que se ve, por capas

Hay tres niveles, de más a menos fiable:

**Visión verdadera.** La casilla se ve entera, pase lo que pase con el terreno.
La dan tres cosas: la **visión en la oscuridad** del personaje, la **luz que
lleva encima** y las casillas pintadas como **luz fija** (un brasero, una
antorcha de pared, una grieta con luz de día), que se ven siempre y desde donde
sea. Ni la niebla ni la oscuridad tapan la visión verdadera; los muros, sí.

**Vista normal.** El radio del mapa, cortado por los muros.

**Terreno pintado**, encima de lo anterior:

- **Oscuridad**: apenas se ve. Dentro alcanzas las ocho casillas de alrededor y
  nada más, y desde fuera no se ve al otro lado, solo el borde de la nube. Humo
  denso, una zarza cerrada, un conjuro de oscuridad. La visión en la oscuridad
  y la antorcha sí la atraviesan, hasta donde lleguen.
- **Niebla**: se ve algo más, y con un degradado. Hasta dos casillas se ve
  todo; de ahí en adelante cada casilla puede verse o no, con menos
  probabilidad cuanto más lejos, hasta que a siete ya no se ve ninguna. El
  efecto es el de mirar dentro de un banco de niebla: cerca se distingue todo,
  lejos solo se adivinan retazos sueltos. El sorteo es estable, así que el mapa
  no parpadea mientras nadie se mueve, pero cambia al moverte, que es
  exactamente lo que hace la niebla de verdad.

Con un personaje en mitad de un banco de niebla, medido: ve las 8 casillas de
alrededor, 13 de las 16 a distancia 2, 17 de 24 a distancia 3, 6 de 40 a
distancia 5 y ninguna a partir de 7.

Con **mapa a oscuras** la cosa cambia: cada personaje ve solo hasta donde llega
su **visión en la oscuridad** (la que le pongas en su ficha, en casillas) más
todo lo que esté **iluminado** por una antorcha y tenga a la vista. Una hoguera
al fondo del pasillo se ve aunque el tramo de en medio siga negro. La luz que
lleva cada uno también se configura en su ficha; una antorcha son 4 casillas.

Las criaturas ocupan lo que les toca por tamaño, como en el manual: diminuto y
pequeño comparten casilla con mediano, **grande** llena 2×2, **enorme** 3×3 y
**gargantuesco** 4×4. El tamaño se deduce solo del bestiario ("Gigante grande"
→ 2×2), y el tablero lo hace cumplir: una criatura no se coloca si no cabe en el
mapa, si se queda a caballo de un muro o si hay otra debajo. Mientras arrastras,
la casilla de destino se marca en rojo cuando no cabe. Un ogro de 2×2 no pasa
por una puerta de una casilla, que es justo lo que se quiere que se note.

En **Ajustes del mapa** decides si la party ve el mapa, si se revela entero, si
cada jugador puede mover su ficha desde el móvil, si puede acercarse y alejarse,
si se pinta el alcance al arrastrar, cuántos pies mide una casilla, cómo cuentan
las diagonales y si la cámara enseña todo el plano o sigue al personaje.

## Ver un área antes de lanzarla

Un jugador con conjuros de área tiene en su mapa el botón **Mis áreas**. Elige
uno, la plantilla se le pega al cursor y un toque la deja fija: entonces le dice
a quién cogería. **Eso se dibuja solo en su pantalla.** Ni el DM ni el resto de
la mesa lo ven, y no gasta nada: es para mirar a ojo si el cono coge a los tres
goblins antes de decidirse, sin tener que pedirle al DM que lo mida.

Se distingue de las plantillas de la mesa porque va con el borde a rayas, y se
quita con «Quitar áreas». Para lanzarlo de verdad se usa **Atacar** en la ficha,
que es donde se gasta el espacio de conjuro.

## Dados y charla

El panel de la derecha (abajo, en el móvil) tira `1d20+5`, `2d6`, `8d6` y lo que
le eches, con botones para ventaja y desventaja. Los críticos y las pifias se
marcan. Todo va a un registro común que ven todos, salvo lo que el DM tire con
**En secreto**. Las características, salvaciones y habilidades de cada ficha se
tiran desde la propia ficha, ya con su modificador.

Debajo del registro hay una **caja para hablar**. El botón del bocadillo abre
la lista de la mesa: marcas al DM, a un jugador o a varios, y el mensaje se
convierte en un **susurro** que solo leen ellos. Vale para todos, no solo para
el DM: un jugador puede pasarle una idea a otro, y el DM puede contarles algo a
dos a la vez sin que se entere el resto. Lo que susurras no llega siquiera al
navegador de los demás y **nunca sale en la tele de la mesa**. Sin marcar a
nadie, lo lee toda la mesa.

El registro se filtra por **Todo**, **Tiradas** o **Charla**, y en el móvil sale
un punto en la pestaña cuando hay algo sin leer.

Desde **⋯ → Pedir una tirada a la party** eliges qué pides, a quién y con qué
CD; a cada jugador le sale un botón grande en su móvil y, al pulsarlo, tira y se
anuncia si supera la dificultad. Y con **Enseñar una imagen a la mesa** sale a
pantalla completa en la tele y en el móvil de todos: mapas de tesoro, cartas,
retratos del villano.

## La pantalla de la mesa

La tele es **una sesión aparte**, con su propio nombre y su propio testigo: no
hereda la tuya aunque la abras en el mismo ordenador, y no puede tocar nada de
la partida. Desde **⋯ → Pantalla de la party** la abres, ves cuántas hay
conectadas y decides qué enseña: el mapa, los puntos de vida exactos de la
party y si se revela el plano entero. La propia pantalla tiene, arriba y muy
discreto, el botón de pantalla completa y el de salir, que devuelve al menú de
entrada igual que en las otras dos vistas.

### Lo que se ve en la tele

Fuera de combate, las cartas de la party ocupan la fila entera, con su retrato,
su clase, su barra de vida, su CA y sus estados como etiquetas.

El mapa manda: ocupa todo el alto que sobra, centrado, con margen a los cuatro
lados. Con el plano entero a la vista, el hueco toma la forma del mapa para que
no queden franjas negras; siguiendo a un personaje, el encuadre se adapta al
hueco y, cuando alguien llega al borde del plano, **lo que se mueve es él dentro
del encuadre**, en vez de quedarse el mapa a un lado con una franja negra al
otro.

Fuera de combate no hay nada encima del mapa: solo el plano, y debajo la party
centrada. En combate **el mapa sigue mandando**: se queda en el centro con todo
el alto libre, **la party pegada al borde izquierdo y los enemigos pegados al
borde derecho**, en espejo y con cartas compactas (cara, nombre, vida y
estados). Si todavía no hay enemigos a la vista, su columna se la queda el
mapa. **Quien tiene el turno** va en una franja arriba: retrato, vida, clase de
armadura, los pies de movimiento que le quedan, si ha gastado ya la acción, la
adicional o la reacción, los estados que sufre, en qué está concentrado y quién
va después. Debajo, la tira de iniciativa. Los que no están en la pelea se
apagan. En una pantalla estrecha o en vertical todo se apila con el mapa
primero.

### Movimiento

Las animaciones son pocas y con intención: solo se mueve lo que acaba de
cambiar. Las fichas **se deslizan** de casilla a casilla (y la cámara que sigue
a un personaje lo acompaña sin saltos); al empezar un turno, un **aro dorado**
se abre una vez desde la ficha de quien actúa; un golpe deja un **halo rojo** y
una cura uno verde, en el mapa y en su carta, y las barras de vida bajan
deslizándose. Las ventanas, el bestiario y las pestañas entran con un fundido
corto. Nada se anima en bucle, así que la tele no gasta de más, y quien tenga
activado «reducir movimiento» en su sistema no ve ninguna animación.

Una criatura que sale de la niebla aparece sin deslizarse: si lo hiciera,
enseñaría por dónde ha venido.

## Dónde viven los datos

En la carpeta `data/` junto al programa: `mesa.json` con la partida e `images/`
con los planos y los retratos. Se guarda solo, unas décimas después de cada
cambio, y sobrevive a que cierres la ventana.

Desde **⋯ → Guardar copia de la partida** te llevas un `.json` con todo, y
**Cargar una copia** lo devuelve. Las copias de la versión anterior de Mesa (la
de escritorio) se cargan igual: personajes, bestiario, mapas, muros y retratos
se convierten solos. Los planos y las caras, que en aquellos archivos iban
incrustados en el propio `.json`, se sacan a `data/images/` al importarlos: por
eso una partida de medio mega se queda en unos 27 KB de estado, que es lo que
viaja a cada cambio.

## Atajos del DM

| Acción | Atajo |
|---|---|
| Añadir personaje | `Ctrl/Cmd + N` |
| Iniciar o terminar combate | `Ctrl/Cmd + K` |
| Abrir el bestiario | `Ctrl/Cmd + B` |
| Siguiente turno | `barra espaciadora` o `Ctrl/Cmd + →` |
| Turno anterior | `Ctrl/Cmd + ←` |
| Deshacer | `Ctrl/Cmd + Z` |
| Soltar la selección o la plantilla | `Esc` |
| Apuntar a una ficha del mapa | `Ctrl/Cmd` + clic |
| Señalar un punto | `Alt` + clic |

En la pantalla de la party, doble clic entra y sale de pantalla completa.

## Estructura

```
server.js              servidor: estático, estado, filtrado por rol y guardado
public/
  index.html           el documento; la interfaz la monta el JavaScript
  manifest.webmanifest lo que hace falta para instalarla como aplicación
  sw.js                trabajador de fondo: guarda el código y las imágenes
  icons/               iconos de la aplicación (normal, «maskable» y Apple)
  css/mesa.css         estilos
  js/
    main.js            entrada a la partida y reparto de vistas
    net.js             conexión, reconexión y envío de operaciones
    schema.js          forma de los datos y migración (lo usan servidor y navegador)
    los.js             muros, luz, visión, distancias y plantillas (compartido)
    attacks.js         leer y lanzar ataques
    attacks-core.js    el trozo de los ataques que también usa el servidor
    map.js             el tablero en canvas
    dm.js              vista del DM
    player.js          vista del jugador
    screen.js          pantalla de la party
    dice.js            motor de dados
    dice-panel.js      panel de dados y registro
    char-editor.js     editor de fichas
    catalog.js         criaturas de partida
data/                  la partida y las imágenes (se crea al arrancar)
```

## Seguridad, con nombre y apellidos

- El rol de DM pide un código que solo sale en tu terminal.
- Cada jugador solo puede tocar su ficha, y solo puede mover su token a
  casillas que su party ve; el servidor lo comprueba, no el navegador.
- Lo que un jugador no debe saber no se le manda: ni la CA de un monstruo, ni
  sus PV exactos, ni tus notas del mapa, ni las plantillas que no compartas, ni
  los susurros de otro.
- Las tiradas de ataque y el reparto de puntos de vida se resuelven en el
  servidor. Nadie puede decidir desde su navegador que ha impactado.
- Pensado para jugar con amigos en una red de confianza. No hay cuentas y, sin
  `--cert`, tampoco cifrado: si lo expones a internet, usa un túnel privado
  (que ya pone HTTPS) y no repartas la URL.

## Lo que aún no hace

Terreno difícil que cueste el doble de movimiento, dibujo libre sobre el plano,
listas de conjuros con sus efectos automáticos y voz. Son los siguientes de la
lista.

Del inglés, además: se traduce la interfaz, no la partida. Si escribes tus
notas o el bestiario en español, en inglés seguirán en español.
