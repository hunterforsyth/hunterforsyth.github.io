function isWebGLAvailable() {
    try {
        const canvas = document.createElement( 'canvas' );
        return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
    } catch ( e ) {
        return false;
    }
}

if (isWebGLAvailable()) {
    const w = 256;
    const h = 256;

    var scene = new THREE.Scene();

    var renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setSize(w, h);
    renderer.sortObjects = false;

    var rendererDOM = renderer.domElement;
    rendererDOM.style.display = "inline-block";
    rendererDOM.style.width = "3.5rem";
    rendererDOM.style.height = "3.5rem";

    container = document.getElementById('header-3d');
    container.appendChild(rendererDOM);

    var camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 2;

    const shape2Geo = new THREE.IcosahedronGeometry(0.8, 0);
    const shape2Mat = new THREE.MeshPhongMaterial( { color: 0xFFFFFF, transparent: true, opacity: 1, specular: 0xFFFFFF, shininess: 60 } );
    var shape2 = new THREE.Mesh(shape2Geo, shape2Mat);
    shape2.position.set(0, 0, 0);
    scene.add(shape2);

    const shapeGeo = new THREE.IcosahedronGeometry(1.1, 0);
    const shapeMat = new THREE.MeshPhongMaterial( { color: 0xFFFFFF, transparent: true, opacity: 0.8, specular: 0xFFFFFF, shininess: 30 } );
    var shape = new THREE.Mesh(shapeGeo, shapeMat);
    shape.position.set(0, 0, 0);
    scene.add(shape);

    const light = new THREE.PointLight( 0x2513b7, 2, 100 );
    light.position.set(5, 0, 5);
    scene.add( light );

    const light2 = new THREE.PointLight( 0xd425fe, 1, 100 );
    light2.position.set(-5, 0, 5);
    scene.add( light2 );

    function animate() {
        requestAnimationFrame(animate);

        shape.rotation.x += 0.008;
        shape.rotation.y += 0.008;

        shape2.rotation.x -= 0.004;
        shape2.rotation.y -= 0.004;

        renderer.render(scene, camera);
    };

    animate();
}