(function(){
    'use strict';
    const maxTargets=4,halfAngle=Math.PI/4,range=Math.SQRT2;
    const quadrants=[{x:1,y:-1},{x:1,y:1},{x:-1,y:1},{x:-1,y:-1}];
    function select(monsters,primaryId,columns,{allowDeadOrigin=false}={}){
        const index=monsters.findIndex(monster=>monster.id===primaryId&&(allowDeadOrigin||monster.hp>0));
        if(index<0)return {targetIds:[],angle:0};
        columns=Math.max(1,columns||1);
        const origin={x:index%columns,y:Math.floor(index/columns)};
        const at=(dx,dy)=>{
            const x=origin.x+dx,y=origin.y+dy;
            if(x<0||x>=columns||y<0)return null;
            const monster=monsters[y*columns+x];return monster?.hp>0?monster:null;
        };
        const neighbors=[];
        for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if((x||y)&&at(x,y))neighbors.push({x,y});
        const center=neighbors.reduce((sum,point)=>({x:sum.x+point.x,y:sum.y+point.y}),{x:0,y:0});
        const preference=Math.atan2(center.y,center.x);
        const difference=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
        let best={targets:[],angle:-Math.PI/4,turn:Infinity};
        for(const quadrant of quadrants){
            // Exactly two cardinal neighbors and their shared diagonal.
            // Missing or dead slots stay empty; distant monsters never fill in.
            const targets=[at(0,quadrant.y),at(quadrant.x,0),at(quadrant.x,quadrant.y)].filter(Boolean);
            const angle=Math.atan2(quadrant.y,quadrant.x),turn=difference(angle,preference);
            if(targets.length>best.targets.length||targets.length===best.targets.length&&turn<best.turn-1e-8)best={targets,angle,turn};
        }
        return {targetIds:[primaryId,...best.targets.map(target=>target.id)],angle:best.angle};
    }
    window.ReapTargeting=Object.freeze({select,maxTargets,halfAngle,range});
}());
