param([switch]$Inspect)
$ErrorActionPreference = 'Stop'
# Build-time only. The game loads the resulting fonts without runtime processing.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Collections.Generic;
public static class CopersFont {
    static int U16(byte[] b, int p) { return b[p]*256+b[p+1]; }
    static int S16(byte[] b, int p) { return (short)U16(b,p); }
    static int U32(byte[] b, int p) { return (int)((uint)U16(b,p)*65536+(uint)U16(b,p+2)); }
    static void W16(byte[] b,int p,int v) { b[p]=(byte)(v>>8); b[p+1]=(byte)v; }
    static void W32(byte[] b,int p,uint v) { W16(b,p,(int)(v>>16)); W16(b,p+2,(int)v); }
    static uint Sum(byte[] b) { uint n=0; for(int p=0;p<b.Length;p++) n=unchecked(n+((uint)b[p]<<(24-8*(p%4)))); return n; }
    static Dictionary<string,byte[]> Tables(byte[] b) {
        var t=new Dictionary<string,byte[]>();
        for(int i=0;i<U16(b,4);i++) { int p=12+16*i; var v=new byte[U32(b,p+12)]; Buffer.BlockCopy(b,U32(b,p+8),v,0,v.Length); t[Encoding.ASCII.GetString(b,p,4)]=v; }
        return t;
    }
    static int Plus(byte[] c) {
        for(int i=0;i<U16(c,2);i++) {
            int p=U32(c,8+8*i); if(U16(c,p)!=4) continue;
            int n=U16(c,p+6)/2;
            for(int j=0;j<n;j++) {
                int end=U16(c,p+14+2*j), start=U16(c,p+16+2*n+2*j);
                if(start>43 || end<43) continue;
                int delta=S16(c,p+16+4*n+2*j), r=p+16+6*n+2*j, range=U16(c,r);
                return range==0 ? (43+delta)&65535 : (U16(c,r+range+2*(43-start))+delta)&65535;
            }
        }
        throw new Exception("No plus glyph in cmap");
    }
    static byte[] Rename(byte[] b) {
        int n=U16(b,2), storage=U16(b,4); var strings=new MemoryStream(); var result=new byte[6+12*n];
        W16(result,2,n); W16(result,4,result.Length);
        for(int i=0;i<n;i++) {
            int p=6+12*i, id=U16(b,p+6), len=U16(b,p+8), off=storage+U16(b,p+10);
            byte[] s=new byte[len]; Buffer.BlockCopy(b,off,s,0,len);
            if(new int[]{1,2,3,4,6,16,17,18,21,22}.Contains(id)) {
                Encoding enc=U16(b,p)==0 || U16(b,p)==3 ? Encoding.BigEndianUnicode : Encoding.GetEncoding(10000);
                string value=enc.GetString(s).Replace("Pixeloid", "Copers");
                s=enc.GetBytes(value);
            }
            Buffer.BlockCopy(b,p,result,p,8); W16(result,p+8,s.Length); W16(result,p+10,(int)strings.Length); strings.Write(s,0,s.Length);
        }
        return result.Concat(strings.ToArray()).ToArray();
    }
    public static void Build(string source,string target,bool inspect) {
        byte[] original=File.ReadAllBytes(source); var t=Tables(original); int id=Plus(t["cmap"]), count=U16(t["maxp"],4);
        bool shortLoca=S16(t["head"],50)==0; var offsets=new int[count+1];
        for(int i=0;i<=count;i++) offsets[i]=shortLoca ? U16(t["loca"],2*i)*2 : U32(t["loca"],4*i);
        byte[] glyf=t["glyf"]; int at=offsets[id], contours=S16(glyf,at);
        if(contours<=0) throw new Exception("Expected simple plus outline");
        int points=U16(glyf,at+10+2*(contours-1))+1, p0=at+10+2*contours;
        int instructionLength=U16(glyf,p0), cursor=p0+2+instructionLength;
        var flags=new List<byte>();
        while(flags.Count<points) { byte f=glyf[cursor++]; flags.Add(f); if((f&8)!=0) { int r=glyf[cursor++]; for(int j=0;j<r;j++) flags.Add(f); } }
        int[] x=new int[points], y=new int[points]; int v=0;
        for(int i=0;i<points;i++) { int f=flags[i]; v+=(f&2)!=0 ? ((f&16)!=0?1:-1)*glyf[cursor++] : (f&16)!=0 ? 0 : S16(glyf,cursor); if((f&2)==0&&(f&16)==0) cursor+=2; x[i]=v; }
        v=0;
        for(int i=0;i<points;i++) { int f=flags[i]; v+=(f&4)!=0 ? ((f&32)!=0?1:-1)*glyf[cursor++] : (f&32)!=0 ? 0 : S16(glyf,cursor); if((f&4)==0&&(f&32)==0) cursor+=2; y[i]=v; }
        int advance=U16(t["hmtx"],4*id), left=S16(t["hmtx"],4*id+2);
        Console.WriteLine(Path.GetFileName(source)+": glyph="+id+" advance="+advance+" lsb="+left+" x="+string.Join(",",x.Distinct().OrderBy(a=>a))+" y="+string.Join(",",y.Distinct().OrderBy(a=>a))+" instructions="+instructionLength);
        if(inspect) return;
        // Extend the ends of each arm by one original pixel; retain stroke thickness.
        int xmin=x.Min(), xmax=x.Max(), ymin=y.Min(), ymax=y.Max();
        int[] grid=x.Concat(y).Distinct().OrderBy(a=>a).ToArray(); int pixel=0;
        for(int i=1;i<grid.Length;i++) { int a=pixel,b=grid[i]-grid[i-1]; while(b!=0) {int r=a%b;a=b;b=r;} pixel=a; }
        if(pixel<=0) throw new Exception("Cannot determine original pixel grid");
        // The original has no left bearing. Move the center one pixel right and
        // widen this character's advance by two pixels to retain its spacing.
        advance+=2*pixel;
        for(int i=0;i<points;i++) { if(x[i]==xmin)x[i]-=pixel; else if(x[i]==xmax)x[i]+=pixel; x[i]+=pixel; if(y[i]==ymin)y[i]-=pixel; else if(y[i]==ymax)y[i]+=pixel; }
        if(x.Min()<0 || x.Max()>advance || y.Min()<S16(t["head"],38) || y.Max()>S16(t["head"],42)) throw new Exception("Enlargement exceeds font bounds");
        var replacement=new byte[12+2*contours+5*points];
        Buffer.BlockCopy(glyf,at,replacement,0,10+2*contours);
        W16(replacement,2,x.Min()); W16(replacement,4,y.Min()); W16(replacement,6,x.Max()); W16(replacement,8,y.Max());
        int start=12+2*contours;
        for(int i=0;i<points;i++) replacement[start+i]=(byte)(flags[i]&0xC1);
        for(int i=0;i<points;i++) { W16(replacement,start+points+2*i,x[i]-(i==0?0:x[i-1])); W16(replacement,start+3*points+2*i,y[i]-(i==0?0:y[i-1])); }
        var stream=new MemoryStream(); var loca=new byte[t["loca"].Length];
        for(int i=0;i<count;i++) {
            if(shortLoca) W16(loca,2*i,(int)stream.Length/2); else W32(loca,4*i,(uint)stream.Length);
            if(i==id) stream.Write(replacement,0,replacement.Length); else stream.Write(glyf,offsets[i],offsets[i+1]-offsets[i]);
            if(stream.Length%2!=0)stream.WriteByte(0);
        }
        if(shortLoca)W16(loca,2*count,(int)stream.Length/2); else W32(loca,4*count,(uint)stream.Length);
        t["glyf"]=stream.ToArray(); t["loca"]=loca;
        W16(t["hmtx"],4*id,advance);
        W16(t["hmtx"],4*id+2,x.Min());
        t["name"]=Rename(t["name"]); t.Remove("DSIG"); W32(t["head"],8,0);
        var tags=t.Keys.OrderBy(a=>a,StringComparer.Ordinal).ToArray(); int length=12+16*tags.Length;
        foreach(string tag in tags) length+=(t[tag].Length+3)&~3;
        var output=new byte[length]; Buffer.BlockCopy(original,0,output,0,12); W16(output,4,tags.Length);
        int power=1,selector=0; while(power*2<=tags.Length){power*=2;selector++;}
        W16(output,6,16*power);W16(output,8,selector);W16(output,10,16*tags.Length-16*power);
        int offset=12+16*tags.Length, head=0;
        for(int i=0;i<tags.Length;i++) { string tag=tags[i]; byte[] data=t[tag]; int p=12+16*i; Buffer.BlockCopy(Encoding.ASCII.GetBytes(tag),0,output,p,4); W32(output,p+4,Sum(data)); W32(output,p+8,(uint)offset); W32(output,p+12,(uint)data.Length); Buffer.BlockCopy(data,0,output,offset,data.Length); if(tag=="head")head=offset; offset+=(data.Length+3)&~3; }
        W32(output,head+8,unchecked(0xB1B0AFBAu-Sum(output)));
        if(Sum(output)!=0xB1B0AFBAu)throw new Exception("Invalid font checksum");
        // Only plus geometry, its bearing, names, and derived offsets/checksums may change.
        var verify=Tables(output);
        foreach(string tag in tags) if(!new[]{"glyf","loca","hmtx","head","name"}.Contains(tag) && !verify[tag].SequenceEqual(t[tag]))throw new Exception("Unexpected table change: "+tag);
        File.WriteAllBytes(target,output);
        Console.WriteLine("Wrote "+Path.GetFileName(target)+": "+(xmax-xmin)+"x"+(ymax-ymin)+" -> "+(x.Max()-x.Min())+"x"+(y.Max()-y.Min())+"; pixel="+pixel+"; advance="+advance+".");
    }
}
'@
$fontPath = Join-Path $PSScriptRoot '../assets/fonts'
foreach ($weight in @('', '-bold')) {
    [CopersFont]::Build((Join-Path $fontPath "pixeloid-sans$weight.ttf"), (Join-Path $fontPath "copers-sans$weight.ttf"), $Inspect.IsPresent)
}
