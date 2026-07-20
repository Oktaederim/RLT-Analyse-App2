"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const allInputs = document.querySelectorAll(
        'input[type="number"], input[type="radio"]'
    );

    allInputs.forEach(input => {

        input.addEventListener(
            input.type === "radio" ? "change" : "input",
            () => {

                if (input.type === "radio") {
                    toggleUI();
                }

                calculate();
            }
        );
    });

    document
        .getElementById("resetBtn")
        .addEventListener("click", resetAll);

    toggleUI();
    calculate();
});


const defaultValues = {

    tempAussen: 20.0,
    rhAussen: 50.0,

    tempZuluft: 20.0,
    rhZuluft: 60.0,
    xZuluft: 7.0,

    volumenstrom: 5000,
    druck: 1013.25,

    tempVEZiel: 5.0,

    tempHeizVorlauf: 70,
    tempHeizRuecklauf: 50,

    tempKuehlVorlauf: 8,
    tempKuehlRuecklauf: 13,

    maxZuluftRh: 70,
    taupunktReserve: 2,

    betriebsmodus: "entfeuchten",
    heizkonzept: "standard",
    regelungsart: "trh"
};


function resetAll() {

    for (const [key, value] of Object.entries(defaultValues)) {

        const element =
            document.getElementById(key);

        if (element) {

            element.value = value;

        } else {

            const radio =
                document.querySelector(
                    `input[name="${key}"][value="${value}"]`
                );

            if (radio) {
                radio.checked = true;
            }
        }
    }

    const kritischeOberflaeche =
        document.getElementById(
            "kritischeOberflaeche"
        );

    if (kritischeOberflaeche) {
        kritischeOberflaeche.value = "";
    }

    toggleUI();
    calculate();
}


function toggleUI() {

    const heizkonzept =
        document.querySelector(
            'input[name="heizkonzept"]:checked'
        ).value;

    const regelungsart =
        document.querySelector(
            'input[name="regelungsart"]:checked'
        ).value;

    const betriebsmodus =
        document.querySelector(
            'input[name="betriebsmodus"]:checked'
        ).value;


    document
        .getElementById("kuehlwasserWrapper")
        .classList.toggle(
            "hidden",
            betriebsmodus === "heizen"
        );


    document
        .getElementById("zuluft-trh-wrapper")
        .classList.toggle(
            "hidden",
            regelungsart !== "trh"
        );


    document
        .getElementById("zuluft-x-wrapper")
        .classList.toggle(
            "hidden",
            regelungsart !== "x"
        );


    document
        .getElementById("veZielTempWrapper")
        .classList.toggle(
            "hidden",
            heizkonzept !== "standard"
        );
}


/* =====================================================
   PSYCHROMETRISCHE GRUNDFUNKTIONEN
   ===================================================== */

const clamp = (
    value,
    min,
    max
) => Math.min(
    max,
    Math.max(
        min,
        value
    )
);


const getSVP = T =>

    6.112 *

    Math.exp(
        (
            17.62 *
            T
        ) /
        (
            243.12 +
            T
        )
    );


const getAbsFeuchte = (
    T,
    rh,
    p
) => {

    const pv =
        clamp(
            rh,
            0,
            100
        ) /
        100 *
        getSVP(T);

    return (
        622 *
        pv
    ) /
    Math.max(
        0.001,
        p -
        pv
    );
};


const getRelFeuchte = (
    T,
    x,
    p
) => {

    const svp =
        getSVP(T);

    if (
        svp <= 0
    ) {
        return 0;
    }

    return clamp(

        (
            x *
            p
        ) /
        (
            svp *
            (
                622 +
                x
            )
        ) *
        100,

        0,
        100
    );
};


const getEnthalpie = (
    T,
    x
) => {

    return (

        1.006 *
        T

        +

        (
            x /
            1000
        ) *
        (
            2501 +
            1.86 *
            T
        )
    );
};


const getTaupunkt = (
    T,
    rh
) => {

    if (
        rh <= 0
    ) {
        return -273.15;
    }

    const a = 17.62;
    const b = 243.12;

    const alpha =

        Math.log(
            clamp(
                rh,
                0.0001,
                100
            ) /
            100
        )

        +

        (
            a *
            T
        ) /
        (
            b +
            T
        );

    return (
        b *
        alpha
    ) /
    (
        a -
        alpha
    );
};


const getDichte = (
    T,
    rh,
    p
) => {

    const pPa =
        p *
        100;

    const TK =
        T +
        273.15;

    const pv =

        clamp(
            rh,
            0,
            100
        ) /
        100 *

        getSVP(T) *

        100;

    return (

        (
            pPa -
            pv
        ) /
        (
            287.058 *
            TK
        )

        +

        pv /
        (
            461.52 *
            TK
        )
    );
};


/*
    Berechnet die Sättigungstemperatur
    für einen gegebenen Feuchtegehalt x.
*/
const getSaturationTempForX = (
    x,
    p
) => {

    let low = -50;
    let high = 60;

    for (
        let i = 0;
        i < 80;
        i++
    ) {

        const mid =
            (
                low +
                high
            ) /
            2;

        const xSat =
            getAbsFeuchte(
                mid,
                100,
                p
            );

        if (
            xSat <
            x
        ) {

            low = mid;

        } else {

            high = mid;
        }
    }

    return (
        low +
        high
    ) /
    2;
};


/*
    Ermittelt die notwendige Temperatur,
    damit bei gegebenem x eine gewünschte
    maximale relative Feuchte eingehalten wird.
*/
const getTempForRhAtX = (
    x,
    targetRh,
    p
) => {

    let low = -50;
    let high = 80;

    for (
        let i = 0;
        i < 80;
        i++
    ) {

        const mid =
            (
                low +
                high
            ) /
            2;

        const rh =
            getRelFeuchte(
                mid,
                x,
                p
            );

        /*
            Mit steigender Temperatur sinkt
            bei konstantem x die relative Feuchte.
        */
        if (
            rh >
            targetRh
        ) {

            low = mid;

        } else {

            high = mid;
        }
    }

    return (
        low +
        high
    ) /
    2;
};


const createZustand = (
    T,
    rh,
    xVal,
    p
) => {

    const zustand = {
        T,
        p
    };


    if (
        xVal !== null &&
        Number.isFinite(
            xVal
        )
    ) {

        zustand.x =
            Math.max(
                0,
                xVal
            );

        zustand.rh =
            getRelFeuchte(
                T,
                zustand.x,
                p
            );

    } else {

        zustand.rh =
            clamp(
                rh,
                0,
                100
            );

        zustand.x =
            getAbsFeuchte(
                T,
                zustand.rh,
                p
            );
    }


    zustand.h =
        getEnthalpie(
            zustand.T,
            zustand.x
        );


    zustand.td =
        getTaupunkt(
            zustand.T,
            zustand.rh
        );


    zustand.rho =
        getDichte(
            zustand.T,
            zustand.rh,
            p
        );


    return zustand;
};


function readNumber(
    id,
    fallback = 0
) {

    const element =
        document.getElementById(id);

    if (!element) {
        return fallback;
    }

    const value =
        parseFloat(
            element.value
        );

    return Number.isFinite(value)
        ? value
        : fallback;
}


/* =====================================================
   HAUPTBERECHNUNG
   ===================================================== */

function calculate() {

    const kritischeOberflaecheElement =
        document.getElementById(
            "kritischeOberflaeche"
        );


    const inputs = {

        betriebsmodus:
            document.querySelector(
                'input[name="betriebsmodus"]:checked'
            ).value,

        heizkonzept:
            document.querySelector(
                'input[name="heizkonzept"]:checked'
            ).value,

        regelungsart:
            document.querySelector(
                'input[name="regelungsart"]:checked'
            ).value,


        tAussen:
            readNumber(
                "tempAussen",
                20
            ),

        rhAussen:
            readNumber(
                "rhAussen",
                50
            ),


        tZuluft:
            readNumber(
                "tempZuluft",
                20
            ),

        rhZuluft:
            readNumber(
                "rhZuluft",
                60
            ),

        xZuluft:
            readNumber(
                "xZuluft",
                7
            ),


        volumenstrom:
            Math.max(
                0,
                readNumber(
                    "volumenstrom",
                    5000
                )
            ),


        druck:
            Math.max(
                100,
                readNumber(
                    "druck",
                    1013.25
                )
            ),


        tVEZiel:
            readNumber(
                "tempVEZiel",
                5
            ),


        tHeizV:
            readNumber(
                "tempHeizVorlauf",
                70
            ),

        tHeizR:
            readNumber(
                "tempHeizRuecklauf",
                50
            ),


        tKuehlV:
            readNumber(
                "tempKuehlVorlauf",
                8
            ),

        tKuehlR:
            readNumber(
                "tempKuehlRuecklauf",
                13
            ),


        maxZuluftRh:
            clamp(
                readNumber(
                    "maxZuluftRh",
                    70
                ),
                1,
                100
            ),


        taupunktReserve:
            Math.max(
                0,
                readNumber(
                    "taupunktReserve",
                    2
                )
            ),


        kritischeOberflaeche:

            (
                kritischeOberflaecheElement &&
                kritischeOberflaecheElement
                    .value
                    .trim() !== ""
            )

                ? parseFloat(
                    kritischeOberflaecheElement
                        .value
                )

                : null
    };


    const outside =
        createZustand(
            inputs.tAussen,
            inputs.rhAussen,
            null,
            inputs.druck
        );


    const target =

        inputs.regelungsart ===
        "trh"

            ? createZustand(
                inputs.tZuluft,
                inputs.rhZuluft,
                null,
                inputs.druck
            )

            : createZustand(
                inputs.tZuluft,
                null,
                inputs.xZuluft,
                inputs.druck
            );


    if (
        inputs.regelungsart ===
        "x"
    ) {

        const rhDisplay =
            document.getElementById(
                "rh-ergebnis"
            );

        if (rhDisplay) {

            rhDisplay.textContent =
                target.rh.toFixed(1);
        }
    }


    const result =
        simulateProcess(
            outside,
            target,
            inputs
        );


    updateUI(
        result,
        inputs
    );
}


/* =====================================================
   PROZESSSIMULATION
   ===================================================== */

function simulateProcess(
    outside,
    target,
    inputs
) {

    const EPS_T = 0.05;
    const EPS_X = 0.02;


    /*
        Luftmassenstrom auf Basis
        der berechneten Außenluftdichte.
    */
    const mAir =

        inputs.volumenstrom *

        outside.rho /

        3600;


    const needCooling =

        outside.T >

        target.T +

        EPS_T;


    const needHeating =

        outside.T <

        target.T -

        EPS_T;


    const needDehum =

        outside.x >

        target.x +

        EPS_X;


    const needHum =

        outside.x <

        target.x -

        EPS_X;


    let s1 = {
        ...outside
    };

    let s2 = {
        ...outside
    };

    let s3 = {
        ...outside
    };


    let pVE = 0;
    let pK = 0;
    let pNE = 0;

    let condensate = 0;

    let coolingTargetTemp = null;


    const requiredProcess = [];
    const limitations = [];
    const plausibility = [];


    /*
        Betriebsmodi:

        heizen
        = keine Kühlung verfügbar

        kuehlen_sensibel
        = nur sensible Kühlung,
          keine aktive Entfeuchtung

        entfeuchten
        = Kühlung und Entfeuchtung möglich
    */
    const coolingAvailable =
        inputs.betriebsmodus !==
        "heizen";


    const dehumAvailable =
        inputs.betriebsmodus ===
        "entfeuchten";


    /* =================================================
       1. VORERHITZER / FROSTSCHUTZ
       ================================================= */

    if (

        inputs.heizkonzept ===
        "standard"

        &&

        outside.T <
        inputs.tVEZiel -
        EPS_T

        &&

        (
            inputs.betriebsmodus ===
            "entfeuchten"

            ||

            inputs.betriebsmodus ===
            "kuehlen_sensibel"
        )

    ) {

        s1 =
            createZustand(
                inputs.tVEZiel,
                null,
                outside.x,
                inputs.druck
            );


        pVE =

            mAir *

            (
                s1.h -
                outside.h
            );


        requiredProcess.push(
            "Vorerwärmen/Frostschutz"
        );
    }


    /* =================================================
       2. KÜHLER
       ================================================= */


    /*
        MODUS:
        KÜHLEN SENSIBEL

        Wichtig:
        Die Solltemperatur wird angefahren.

        x bleibt konstant.

        Die resultierende relative Feuchte wird
        aus dem realen Zustand berechnet.

        Eine eventuell erforderliche Entfeuchtung
        wird nur als Hinweis angezeigt.
    */
    if (
        inputs.betriebsmodus ===
        "kuehlen_sensibel"
    ) {

        if (
            s1.T >
            target.T +
            EPS_T
        ) {

            requiredProcess.push(
                "Sensibel kühlen"
            );


            s2 =
                createZustand(
                    target.T,
                    null,
                    s1.x,
                    inputs.druck
                );


            pK =

                mAir *

                (
                    s2.h -
                    s1.h
                );


            if (
                needDehum
            ) {

                limitations.push(
                    "Der gewünschte Feuchtezustand erfordert zusätzlich Entfeuchtung. Im Modus „Kühlen (sensibel)“ bleibt der Feuchtegehalt x unverändert."
                );
            }


            if (
                needHum
            ) {

                limitations.push(
                    "Der gewünschte Feuchtezustand würde zusätzlich eine Befeuchtung erfordern. Im Modus „Kühlen (sensibel)“ bleibt der Feuchtegehalt x unverändert."
                );
            }

        } else {

            s2 = {
                ...s1
            };
        }
    }


    /*
        MODUS:
        KÜHLEN & ENTFEUCHTEN
    */
    else if (
        inputs.betriebsmodus ===
        "entfeuchten"
    ) {

        /*
            Entfeuchtung erforderlich:
            auf den zur Sollfeuchte passenden
            Sättigungszustand kühlen.
        */
        if (
            needDehum
        ) {

            requiredProcess.push(
                "Kühlen",
                "Entfeuchten"
            );


            coolingTargetTemp =
                getSaturationTempForX(
                    target.x,
                    inputs.druck
                );


            s2 =
                createZustand(
                    coolingTargetTemp,
                    100,
                    target.x,
                    inputs.druck
                );


            pK =

                mAir *

                (
                    s2.h -
                    s1.h
                );


            condensate =

                mAir *

                Math.max(
                    0,
                    s1.x -
                    s2.x
                ) *

                3.6;
        }


        /*
            Keine Entfeuchtung nötig,
            aber Temperatur muss sinken:
            rein sensibel kühlen.
        */
        else if (
            s1.T >
            target.T +
            EPS_T
        ) {

            requiredProcess.push(
                "Sensibel kühlen"
            );


            s2 =
                createZustand(
                    target.T,
                    null,
                    s1.x,
                    inputs.druck
                );


            pK =

                mAir *

                (
                    s2.h -
                    s1.h
                );


            if (
                needHum
            ) {

                limitations.push(
                    "Die Solltemperatur wird erreicht, der gewünschte höhere Feuchtegehalt würde jedoch eine Befeuchtung erfordern."
                );
            }
        }


        else {

            s2 = {
                ...s1
            };


            if (
                needHum
            ) {

                limitations.push(
                    "Zur vollständigen Zielerreichung wäre eine Befeuchtung erforderlich. Diese Funktion ist im aktuellen Anlagenmodell nicht enthalten."
                );
            }
        }
    }


    /*
        MODUS:
        NUR HEIZEN
    */
    else {

        s2 = {
            ...s1
        };


        if (
            needCooling
        ) {

            limitations.push(
                "Kühlung wäre erforderlich, ist im Betriebsmodus „Nur Heizen“ jedoch nicht verfügbar."
            );
        }


        if (
            needDehum
        ) {

            limitations.push(
                "Entfeuchtung wäre erforderlich, ist im Betriebsmodus „Nur Heizen“ jedoch nicht verfügbar."
            );
        }
    }


    /* =================================================
       3. HEIZEN / NACHERWÄRMEN
       ================================================= */


    /*
        Falls nach Kühler / Ausgangszustand
        die Temperatur unter Soll liegt.
    */
    if (
        s2.T <
        target.T -
        EPS_T
    ) {

        /*
            Nach vorheriger Kühlung /
            Entfeuchtung = Nacherwärmung
        */
        const previousCooling =
            pK <
            -0.01;


        if (
            previousCooling
        ) {

            requiredProcess.push(
                "Nacherwärmen"
            );

        } else {

            requiredProcess.push(
                "Heizen"
            );
        }


        if (
            inputs.heizkonzept ===
            "standard"
        ) {

            s3 =
                createZustand(
                    target.T,
                    null,
                    s2.x,
                    inputs.druck
                );


            pNE =

                mAir *

                (
                    s3.h -
                    s2.h
                );

        } else {

            /*
                VE als Haupterhitzer:
                Bei reinem Heizfall kann
                direkt über VE geheizt werden.
            */
            if (
                !previousCooling
            ) {

                s1 =
                    createZustand(
                        target.T,
                        null,
                        outside.x,
                        inputs.druck
                    );


                pVE =

                    mAir *

                    (
                        s1.h -
                        outside.h
                    );


                s2 = {
                    ...s1
                };


                s3 = {
                    ...s1
                };

            } else {

                limitations.push(
                    "Nacherwärmung wäre erforderlich, ist in der gewählten Anlagenkonfiguration jedoch nicht verfügbar."
                );


                s3 = {
                    ...s2
                };
            }
        }

    } else {

        s3 = {
            ...s2
        };
    }


    /* =================================================
       4. SONDERFALL REINER HEIZBETRIEB
       ================================================= */

    if (

        inputs.betriebsmodus ===
        "heizen"

        &&

        needHeating

    ) {

        if (
            inputs.heizkonzept ===
            "standard"
        ) {

            /*
                Eventueller Frostschutz über VE
            */
            if (
                outside.T <
                inputs.tVEZiel -
                EPS_T
            ) {

                s1 =
                    createZustand(
                        inputs.tVEZiel,
                        null,
                        outside.x,
                        inputs.druck
                    );


                pVE =

                    mAir *

                    (
                        s1.h -
                        outside.h
                    );

            } else {

                s1 = {
                    ...outside
                };
            }


            s2 = {
                ...s1
            };


            s3 =
                createZustand(
                    target.T,
                    null,
                    s2.x,
                    inputs.druck
                );


            pNE =

                mAir *

                (
                    s3.h -
                    s2.h
                );


            if (
                !requiredProcess.includes(
                    "Heizen"
                )
            ) {

                requiredProcess.push(
                    "Heizen"
                );
            }

        } else {

            s1 =
                createZustand(
                    target.T,
                    null,
                    outside.x,
                    inputs.druck
                );


            pVE =

                mAir *

                (
                    s1.h -
                    outside.h
                );


            s2 = {
                ...s1
            };


            s3 = {
                ...s1
            };


            if (
                !requiredProcess.includes(
                    "Heizen"
                )
            ) {

                requiredProcess.push(
                    "Heizen"
                );
            }
        }
    }


    /* =================================================
       5. KEINE BEHANDLUNG
       ================================================= */

    if (
        requiredProcess.length ===
        0
    ) {

        requiredProcess.push(
            "Keine Luftbehandlung erforderlich"
        );
    }


    const finalState = {
        ...s3
    };


    /*
        Soll erreicht:
        Temperatur und Feuchtegehalt
        müssen übereinstimmen.

        Relative Feuchte ergibt sich
        automatisch daraus.
    */
    const targetReached =

        Math.abs(
            finalState.T -
            target.T
        ) <=
        0.15

        &&

        Math.abs(
            finalState.x -
            target.x
        ) <=
        0.05;


    /* =================================================
       6. WASSERVOLUMENSTRÖME
       ================================================= */

    const cpW = 4.187;
    const rhoW = 1000;


    const wvVE =

        pVE >
        0

        &&

        inputs.tHeizV >
        inputs.tHeizR

            ?

            pVE *
            3600 /

            (
                cpW *

                (
                    inputs.tHeizV -
                    inputs.tHeizR
                ) *

                rhoW
            )

            :

            0;


    const wvNE =

        pNE >
        0

        &&

        inputs.tHeizV >
        inputs.tHeizR

            ?

            pNE *
            3600 /

            (
                cpW *

                (
                    inputs.tHeizV -
                    inputs.tHeizR
                ) *

                rhoW
            )

            :

            0;


    const wvK =

        pK <
        0

        &&

        inputs.tKuehlR >
        inputs.tKuehlV

            ?

            Math.abs(
                pK
            ) *
            3600 /

            (
                cpW *

                (
                    inputs.tKuehlR -
                    inputs.tKuehlV
                ) *

                rhoW
            )

            :

            0;


    /* =================================================
       7. PLAUSIBILITÄT KÜHLWASSER
       ================================================= */

    if (

        inputs.betriebsmodus ===
        "entfeuchten"

        &&

        needDehum

        &&

        coolingTargetTemp !==
        null

    ) {

        const margin =

            coolingTargetTemp -

            inputs.tKuehlV;


        if (
            margin <= 0
        ) {

            plausibility.push(

                `⚠ Kühlwasser ${inputs.tKuehlV.toFixed(1)}/${inputs.tKuehlR.toFixed(1)} °C ist für den erforderlichen Lufttaupunkt von ca. ${coolingTargetTemp.toFixed(1)} °C voraussichtlich zu warm.`

            );

        } else if (
            margin <
            2
        ) {

            plausibility.push(

                `⚠ Nur ${margin.toFixed(1)} K Temperaturreserve zwischen Kühlwasser-Vorlauf und erforderlichem Lufttaupunkt. Die tatsächliche Erreichbarkeit hängt stark von der Registerauslegung ab.`

            );

        } else {

            plausibility.push(

                "✓ Kühlwasserniveau grundsätzlich plausibel. Die tatsächliche Erreichbarkeit hängt von Registerauslegung, Wärmeübergang und Bypass-Faktor ab."

            );
        }
    }


    return {

        states: [
            outside,
            s1,
            s2,
            s3
        ],

        finalState,

        target,

        targetReached,

        requiredProcess:
            [
                ...new Set(
                    requiredProcess
                )
            ],

        limitations,

        plausibility,

        powers: {

            pVE,
            pK,
            pNE,

            condensate,

            wvVE,
            wvK,
            wvNE
        }
    };
}


/* =====================================================
   AUSGABE
   ===================================================== */

function updateUI(
    result,
    inputs
) {

    const f = (
        value,
        digits = 1
    ) => {

        return Number.isFinite(
            value
        )

            ? value
                .toFixed(
                    digits
                )
                .replace(
                    ".",
                    ","
                )

            : "--";
    };


    result.states.forEach(
        (
            state,
            index
        ) => {

            setText(
                `res-t-${index}`,
                f(
                    state.T,
                    1
                )
            );


            setText(
                `res-rh-${index}`,
                f(
                    state.rh,
                    1
                )
            );


            setText(
                `res-x-${index}`,
                f(
                    state.x,
                    2
                )
            );
        }
    );


    setText(
        "res-td-0",
        f(
            result.states[0].td,
            1
        )
    );


    setText(
        "res-t-final",
        f(
            result.finalState.T,
            1
        )
    );


    setText(
        "res-rh-final",
        f(
            result.finalState.rh,
            1
        )
    );


    setText(
        "res-x-final",
        f(
            result.finalState.x,
            2
        )
    );


    setText(
        "res-td-final",
        f(
            result.finalState.td,
            1
        )
    );


    setText(

        "target-line",

        `Soll: ${f(result.target.T, 1)} °C | ` +

        `${f(result.target.rh, 1)} % r.F. | ` +

        `x ${f(result.target.x, 2)} g/kg | ` +

        `Td ${f(result.target.td, 1)} °C`

    );


    setText(
        "res-p-ve",
        f(
            result.powers.pVE,
            2
        )
    );


    setText(
        "res-p-k",
        f(
            Math.abs(
                result.powers.pK
            ),
            2
        )
    );


    setText(
        "res-p-ne",
        f(
            result.powers.pNE,
            2
        )
    );


    setText(
        "res-kondensat",
        f(
            result.powers.condensate,
            2
        )
    );


    setText(
        "res-wv-ve",
        f(
            result.powers.wvVE,
            2
        )
    );


    setText(
        "res-wv-k",
        f(
            result.powers.wvK,
            2
        )
    );


    setText(
        "res-wv-ne",
        f(
            result.powers.wvNE,
            2
        )
    );


    setText(

        "res-hw-ve",

        `${f(inputs.tHeizV, 1)} / ` +
        `${f(inputs.tHeizR, 1)}`

    );


    setText(

        "res-hw-ne",

        `${f(inputs.tHeizV, 1)} / ` +
        `${f(inputs.tHeizR, 1)}`

    );


    setText(

        "res-kw-k",

        `${f(inputs.tKuehlV, 1)} / ` +
        `${f(inputs.tKuehlR, 1)}`

    );


    const totalHeat =

        result.powers.pVE +

        result.powers.pNE;


    setText(

        "summary-power-heat",

        `${f(
            totalHeat,
            2
        )} kW`

    );


    setText(

        "summary-power-cool",

        `${f(
            Math.abs(
                result.powers.pK
            ),
            2
        )} kW`

    );


    setText(

        "summary-condensate",

        `${f(
            result.powers.condensate,
            2
        )} kg/h`

    );


    setText(

        "summary-delta-t",

        `${signed(
            result.finalState.T -
            result.states[0].T,
            1
        )} K`

    );


    setText(

        "summary-delta-x",

        `${signed(
            result.finalState.x -
            result.states[0].x,
            2
        )} g/kg`

    );


    setText(

        "summary-delta-td",

        `${signed(
            result.finalState.td -
            result.states[0].td,
            1
        )} K`

    );


    updateVisuals(
        result
    );


    updateHints(
        result,
        inputs
    );


    updateSummary(
        result
    );
}


/* =====================================================
   PROZESSGRAFIK
   ===================================================== */

function updateVisuals(
    result
) {

    const overview =
        document.createElement(
            "div"
        );


    overview.className =

        `process-overview ${

            result.targetReached

                ? "process-ok"

                : "process-warning"

        }`;


    overview.innerHTML =

        `<strong>${

            escapeHtml(

                result.requiredProcess.join(
                    " → "
                )

            )

        }</strong>`

        +

        (

            result.limitations.length

                ?

                `<div class="overview-limitations">${

                    result.limitations

                        .map(
                            text =>
                                `⚠ ${escapeHtml(text)}`
                        )

                        .join(
                            "<br>"
                        )

                }</div>`

                :

                ""

        );


    const container =
        document.getElementById(
            "process-overview-container"
        );


    container.innerHTML = "";


    container.appendChild(
        overview
    );


    setComponentState(

        "comp-ve",

        result.powers.pVE >
        0.01,

        "heating"

    );


    setComponentState(

        "comp-k",

        result.powers.pK <
        -0.01,

        "cooling"

    );


    setComponentState(

        "comp-ne",

        result.powers.pNE >
        0.01,

        "heating"

    );


    setText(

        "status-ve",

        result.powers.pVE >
        0.01

            ? "aktiv"

            : "keine Behandlung"

    );


    setText(

        "status-k",

        result.powers.pK <
        -0.01

            ?

            (

                result.powers.condensate >
                0.01

                    ? "Kühlen + Entfeuchten"

                    : "sensibel kühlen"

            )

            :

            "keine Behandlung"

    );


    const neUnavailable =

        result.requiredProcess.includes(
            "Nacherwärmen"
        )

        &&

        result.powers.pNE <=
        0.01

        &&

        !result.targetReached;


    setText(

        "status-ne",

        neUnavailable

            ?

            "⚠ erforderlich, nicht verfügbar"

            :

            (

                result.powers.pNE >
                0.01

                    ? "aktiv"

                    : "keine Behandlung"

            )

    );


    document
        .getElementById(
            "comp-ne"
        )
        .classList.toggle(
            "unavailable",
            neUnavailable
        );


    setNodeColor(
        "node-0",
        "source"
    );


    setNodeColor(

        "node-1",

        tempColor(

            result.states[1].T,

            result.states[0].T

        )
    );


    setNodeColor(

        "node-2",

        tempColor(

            result.states[2].T,

            result.states[1].T

        )
    );


    setNodeColor(

        "node-3",

        tempColor(

            result.states[3].T,

            result.states[2].T

        )
    );


    /*
        Der Zuluft-Endzustand erhält
        die Farbe entsprechend dem
        letzten realen Prozess.
    */
    setNodeColor(

        "node-final",

        tempColor(

            result.states[3].T,

            result.states[2].T

        )
    );
}


/* =====================================================
   BETRIEBSHINWEISE
   ===================================================== */

function updateHints(
    result,
    inputs
) {

    const hints = [];


    const f =
        value =>

            value

                .toFixed(1)

                .replace(
                    ".",
                    ","
                );


    if (
        result.targetReached
    ) {

        hints.push(

            "<strong>✓ Zuluft-Sollzustand erreicht.</strong>"

        );

    } else {

        hints.push(

            `<strong>⚠ Sollzustand nicht vollständig erreichbar.</strong> ` +

            `Tatsächliche Zuluft: ${formatState(result.finalState)}.`

        );
    }


    /*
        Zusätzliche, besonders verständliche
        Feuchtebewertung bei sensibler Kühlung.
    */
    if (

        inputs.betriebsmodus ===
        "kuehlen_sensibel"

        &&

        Math.abs(
            result.finalState.T -
            result.target.T
        ) <=
        0.15

        &&

        Math.abs(
            result.finalState.rh -
            result.target.rh
        ) >
        0.5

    ) {

        if (
            result.finalState.rh >
            result.target.rh
        ) {

            hints.push(

                `⚠ Die Solltemperatur wird erreicht, die resultierende relative Feuchte beträgt jedoch ${f(result.finalState.rh)} % statt ${f(result.target.rh)} %. ` +

                "Für den gewünschten niedrigeren Feuchtewert wäre zusätzlich eine Entfeuchtung erforderlich."

            );

        } else {

            hints.push(

                `Hinweis: Die Solltemperatur wird erreicht, die resultierende relative Feuchte beträgt ${f(result.finalState.rh)} % statt ${f(result.target.rh)} %. ` +

                "Für den gewünschten höheren Feuchtewert wäre zusätzlich eine Befeuchtung erforderlich."

            );
        }
    }


    /*
        Mindesttemperatur bei vorgegebener
        maximaler relativer Feuchte.
    */
    if (

        result.finalState.rh >

        inputs.maxZuluftRh +

        0.5

    ) {

        const minT =

            getTempForRhAtX(

                result.finalState.x,

                inputs.maxZuluftRh,

                inputs.druck

            );


        if (

            minT >

            result.finalState.T +

            0.1

        ) {

            hints.push(

                `Für höchstens ${inputs.maxZuluftRh.toFixed(0)} % r.F. müsste die Luft bei gleichem Feuchtegehalt auf mindestens ca. <strong>${f(minT)} °C</strong> erwärmt werden. ` +

                "Der Feuchtegehalt x und der Taupunkt bleiben dabei unverändert."

            );
        }
    }


    /*
        Optionale Taupunktreserve
        zur kritischen Oberfläche.
    */
    if (
        Number.isFinite(
            inputs.kritischeOberflaeche
        )
    ) {

        const reserve =

            inputs.kritischeOberflaeche -

            result.finalState.td;


        if (
            reserve <
            0
        ) {

            hints.push(

                `<strong>⚠ Kondensationsrisiko:</strong> ` +

                `Zulufttaupunkt ${f(result.finalState.td)} °C liegt über der kritischen Oberflächentemperatur ${f(inputs.kritischeOberflaeche)} °C.`

            );

        } else if (

            reserve <

            inputs.taupunktReserve

        ) {

            hints.push(

                `<strong>⚠ Geringe Taupunktreserve:</strong> ${f(reserve)} K.`

            );

        } else {

            hints.push(

                `✓ Taupunktreserve zur eingegebenen kritischen Oberfläche: ${f(reserve)} K.`

            );
        }
    }


    document
        .getElementById(
            "operating-hints"
        )
        .innerHTML =

        hints

            .map(
                hint =>
                    `<div class="hint-row">${hint}</div>`
            )

            .join("");
}


/* =====================================================
   ZUSAMMENFASSUNG
   ===================================================== */

function updateSummary(
    result
) {

    setText(

        "summary-process",

        `Prozess: ${result.requiredProcess.join(" → ")}`

    );


    const status =

        document.getElementById(
            "summary-target-status"
        );


    status.textContent =

        result.targetReached

            ? "✓ Zielzustand erreicht"

            : "⚠ Zielzustand nicht vollständig erreicht";


    status.className =

        result.targetReached

            ? "assessment-ok"

            : "assessment-warning";


    const notes = [

        ...result.plausibility,

        ...result.limitations.map(
            text =>
                `⚠ ${text}`
        )
    ];


    document
        .getElementById(
            "summary-plausibility"
        )
        .innerHTML =

        notes.length

            ?

            notes

                .map(
                    escapeHtml
                )

                .join(
                    "<br>"
                )

            :

            "✓ Keine besonderen Plausibilitätswarnungen.";
}


/* =====================================================
   HILFSFUNKTIONEN
   ===================================================== */

function setComponentState(
    id,
    active,
    type
) {

    const node =
        document.getElementById(
            id
        );

    if (!node) {
        return;
    }


    node.classList.remove(
        "active-heating",
        "active-cooling",
        "inactive"
    );


    node.classList.add(

        active

            ?

            (
                type ===
                "heating"

                    ? "active-heating"

                    : "active-cooling"
            )

            :

            "inactive"
    );
}


function setNodeColor(
    id,
    type
) {

    const node =
        document.getElementById(
            id
        );

    if (!node) {
        return;
    }


    node.classList.remove(
        "color-red",
        "color-blue",
        "color-source"
    );


    if (
        type
    ) {

        node.classList.add(
            `color-${type}`
        );
    }
}


function tempColor(
    temperature,
    baseTemperature
) {

    if (

        temperature >

        baseTemperature +

        0.1

    ) {

        return "red";
    }


    if (

        temperature <

        baseTemperature -

        0.1

    ) {

        return "blue";
    }


    return null;
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;
    }
}


function signed(
    value,
    digits
) {

    return (

        value >
        0

            ? "+"

            : ""

    )

    +

    value

        .toFixed(
            digits
        )

        .replace(
            ".",
            ","
        );
}


function formatState(
    state
) {

    return (

        `${state.T.toFixed(1).replace(".", ",")} °C / ` +

        `${state.rh.toFixed(1).replace(".", ",")} % r.F. / ` +

        `x ${state.x.toFixed(2).replace(".", ",")} g/kg / ` +

        `Td ${state.td.toFixed(1).replace(".", ",")} °C`

    );
}


function escapeHtml(
    value
) {

    return String(
        value
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}
