
class ProgressbarIndicator {

    level = 0;

    constructor(level = 0) {
        this.level = level * 1.25;
        return `<div style="width: ${level}" class="pvu_schema_main-pic_indicator_fill"></div>`;
    }

}
