'use strict';

class Texture {
    constructor() {
    	this.textureMap = new Map();
    }

    getTexture(path) {
    	if (this.textureMap.has(path)) {
    		return this.textureMap.get(path);
    	} else {
    		var image = new Image();
        	image.src = path;
        	console.log("new texture loaded");
    		this.textureMap.set(path, image);
    		return image;
    	}

    }


}