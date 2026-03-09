const prompt = require("prompt-sync")({ sigint: true })

class Tablero {
    contenido = []

    constructor() {
        this.contenido = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    }

    showTable() {
        let texto = "";
        texto += "--------------\n";
        for (let tile of this.contenido) {
            texto += `${tile[0]} | ${tile[1]} | ${tile[2]} | ${tile[3]}\n`;
            texto += "--------------\n";
        }
        return texto;
    }
    spawnTile() {
        //Generate random tile
        let randomX = Math.round(Math.random() * 3)
        let randomY = Math.round(Math.random() * 3)
        //Check availability
        if (this.contenido[randomX][randomY] == 0) {
            this.contenido[randomX][randomY] = 2;
        } else {
            this.spawnTile();
        }
    }
    moveTile(direction) {
        switch(direction){
            case 'w':
                
                break;
            case 'a':
                break;
            case 's':
                break;
            case 'd':
                break;
        }
    }
    mergeTiles(tile1, tile2) { };
}

let tablero = new Tablero();
let terminado = false;

do {
    console.clear();
    tablero.spawnTile();
    console.log(tablero.showTable());
    prompt();

} while (terminado === false);
