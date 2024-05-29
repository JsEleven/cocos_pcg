import { _decorator, Component, Node, Color, Graphics, Slider, SpriteFrame, lerp, debug } from "cc";
const { ccclass, property } = _decorator;
import { createUINode, generateNoiseMap, createAveragePoint } from "../Utils";

const TILE_WIDTH = 4;
const TILE_HEIGHT = 4;
const TILE_MAP_WIDTH = 960;
const TILE_MAP_HEIGHT = 640;
const TILE_WIDTH_COUNT = 960 / TILE_WIDTH;
const TILE_HEIGHT_COUNT = 640 / TILE_HEIGHT;

enum TileEnum {
  Dirt, //污垢
  Forest, //森林
  Grass, //草地
  Soil, // 土壤
  Sand, //沙滩
  Sea, //海洋
  Vortex, //涡流
}

@ccclass("MapManager")
export class MapManager extends Component {
  //颜色
  @property(Color)
  dirt: Color = new Color("#4D3D35");
  @property(Color)
  forest: Color = new Color("#3D6112");
  @property(Color)
  grass: Color = new Color("#518A14");
  @property(Color)
  soil: Color = new Color("#B2824E");
  @property(Color)
  sand: Color = new Color("#E5D8B8");
  @property(Color)
  sea: Color = new Color("#00A0EE");
  @property(Color)
  vortex: Color = new Color("#0063C7");

  // 画布节点
  tileMap: Node = null;

  // tile信息
  tiles: Array<Array<{ type: TileEnum }>> = [];

  //噪音地图信息
  noiseMap: number[][] = [];

  // 地图参数
  seed = 1;
  scale = 40;
  octaves = 5;
  persistance = 0.5;
  lacunarity = 2;
  offsetX = 0;
  offsetY = 0;

  // 地形阈值
  threshold = [
    { value: 0.85, color: this.dirt, type: TileEnum.Dirt },
    { value: 0.6, color: this.forest, type: TileEnum.Forest },
    { value: 0.5, color: this.grass, type: TileEnum.Grass },
    { value: 0.45, color: this.soil, type: TileEnum.Soil },
    { value: 0.4, color: this.sand, type: TileEnum.Sand },
    { value: 0.15, color: this.sea, type: TileEnum.Sea },
    { value: 0, color: this.vortex, type: TileEnum.Vortex },
  ];

  //   threshold = [
  //     { value: 0.85, color: this.dirt, type: TileEnum.Dirt },
  //     { value: 0.7, color: this.forest, type: TileEnum.Forest },
  //     { value: 0.4, color: this.grass, type: TileEnum.Grass },
  //     { value: 0.3, color: this.soil, type: TileEnum.Soil },
  //     { value: 0, color: this.sand, type: TileEnum.Sand },
  //     // { value: 0.15, color: this.sea, type: TileEnum.Sea },
  //     // { value: 0, color: this.vortex, type: TileEnum.Vortex },
  //   ];

  start() {
    this.generateNode();
    this.generateMap();
  }

  generateNode() {
    const stage = this.node.getChildByName("Stage");
    this.tileMap = createUINode({
      width: TILE_MAP_WIDTH,
      height: TILE_MAP_HEIGHT,
      parent: stage,
    });
    this.tileMap.addComponent(Graphics);
  }

  generateMap() {
    this.generateNoise();
    this.generateTile();
    // this.generateResource();
  }

  generateNoise() {
    this.noiseMap = generateNoiseMap(
      TILE_WIDTH_COUNT,
      TILE_HEIGHT_COUNT,
      this.seed,
      this.scale,
      this.octaves,
      this.persistance,
      this.lacunarity,
      {
        x: this.offsetX,
        y: this.offsetY,
      }
    );
  }

  generateTile() {
    const graphics = this.tileMap.getComponent(Graphics);
    //清空UI和数据
    graphics.clear();
    this.tiles = Array.from({ length: TILE_WIDTH_COUNT }, () =>
      Array.from({ length: TILE_HEIGHT_COUNT }, () => ({ type: TileEnum.Sea }))
    );

    // 生成UI和数据
    for (let x = 0; x < TILE_WIDTH_COUNT; x++) {
      for (let y = 0; y < TILE_HEIGHT_COUNT; y++) {
        const noiseValue = this.noiseMap[x][y];
        const target = this.threshold.find((e) => noiseValue >= e.value);
        if (!target) {
          continue;
        }

        //UI
        const posX = TILE_WIDTH * x - TILE_MAP_WIDTH / 2;
        const posY = TILE_WIDTH * y - TILE_MAP_HEIGHT / 2;
        graphics.fillColor.fromHEX(`#${target.color.toHEX()}`);
        // const v = noiseValue * 255;

        // graphics.fillColor.fromHEX(new Color(v, v, v, 255).toHEX());
        graphics.fillRect(posX, posY, TILE_WIDTH, TILE_WIDTH);

        //数据
        this.tiles[x][y] = { type: target.type };
      }
    }
  }

  async sliderChange(slider: Slider) {
    // 防抖
    this.unscheduleAllCallbacks();
    await new Promise((rs) => this.scheduleOnce(rs, 0.016));

    // 获得值和节点name
    const value = slider.progress;
    const name = slider.node.name;
    console.log(name, value);

    switch (name) {
      case "Scale":
        this.scale = Math.floor(lerp(10, 100, value));
        break;
      case "Octaves":
        this.octaves = Math.floor(lerp(3, 7, value));
        break;
      case "Persistance":
        this.persistance = lerp(0.4, 1, value);
        break;
      case "Lacunarity":
        this.lacunarity = lerp(2, 6, value);
        break;
      case "OffsetX":
        this.offsetX = value;
        break;
      case "OffsetY":
        this.offsetY = value;
        break;
      default:
        break;
    }

    this.generateMap();
  }

  saveData() {
    console.log(
      JSON.stringify({
        seed: this.seed,
        noiseMap: this.noiseMap,
        width: TILE_WIDTH_COUNT,
        height: TILE_HEIGHT_COUNT,
        scale: this.scale,
        octaves: this.octaves,
        persistance: this.persistance,
        lacunarity: this.lacunarity,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      })
    );
  }

  generateResource() {
    const graphics = this.tileMap.getComponent(Graphics);
    const areaX = (TILE_MAP_WIDTH * 9) / 10;
    const areaY = (TILE_MAP_HEIGHT * 9) / 10;
    const points = createAveragePoint(areaX, areaY, 100);
    for (const { x, y } of points) {
      const posX = x - areaX / 2;
      const posY = y - areaY / 2;
      graphics.fillColor.fromHEX("#A66FE8");
      graphics.fillRect(posX, posY, TILE_WIDTH * 2, TILE_WIDTH * 2);
    }
  }
}
