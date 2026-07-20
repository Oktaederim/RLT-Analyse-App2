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

                berechnen();
            }
        );
    });

    dokumentieren
        .getElementById("resetBtn")
        .addEventListener("click", resetAll);

    toggleUI();
    berechnen();
});


const defaultValues ​​= {

    tempAußen: 20.0,
    rhAußen: 50,0,

    tempZuluft: 20.0,
    rhZuluft: 60,0,
    xZuluft: 7.0,

    Volumenstrom: 5000,
    Druck: 1013.25,

    tempVEZiel: 5.0,

    tempHeizVorlauf: 70,
    tempHeizRücklauf: 50,

    tempKuehlVorlauf: 8,
    tempKuehlRuecklauf: 13,

    maxZuluftRh: 70,
    taupunktReserve: 2,

    kuehlAnsatz: 2,
    Heizansatz: 3,

    Betriebsmodus: "entfeuchten",
    Heizkonzept: "Standard",
    regelungsart: "trh"
};


function resetAll() {

    for (const [key, value] of Object.entries(defaultValues)) {

        const element =
            document.getElementById(key);

        if (element) {

            element.value = value;

        } anders {

            Konstante Radio =
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
    berechnen();
}


function toggleUI() {

    const heizkonzept =
        document.querySelector(
            'input[name="heizkonzept"]:checked'
        ).Wert;

    const regelungsart =
        document.querySelector(
            'input[name="regelungsart"]:checked'
        ).Wert;

    const betriebsmodus =
        document.querySelector(
            'input[name="betriebsmodus"]:checked'
        ).Wert;


    dokumentieren
        .getElementById("kuehlwasserWrapper")
        .classList.toggle(
            "versteckt",
            Betriebsmodus === "heizen"
        );


    dokumentieren
        .getElementById("zuluft-trh-wrapper")
        .classList.toggle(
            "versteckt",
            regelungsart !== "trh"
        );


    dokumentieren
        .getElementById("zuluft-x-wrapper")
        .classList.toggle(
            "versteckt",
            regelungsart !== "x"
        );


    dokumentieren
        .getElementById("veZielTempWrapper")
        .classList.toggle(
            "versteckt",
            Heizkonzept !== "Standard"
        );
}


/* =====================================================
   PSYCHROMETRISCHE GRUNDFUNKTIONEN
   ======================================================= */

const clamp = (
    Wert,
    min,
    max
) => Math.min(
    max,
    Math.max(
        min,
        Wert
    )
);


const getSVP = T =>

    6.112 *

    Math.exp(
        (
            17,62 *
            T
        ) /
        (
            243,12 +
            T
        )
    );


const getAbsFeuchte = (
    T,
    rh,
    P
) => {

    Konstante PV =
        Klemme(
            rh,
            0,
            100
        ) /
        100 *
        getSVP(T);

    zurückkehren (
        622 *
        PV
    ) /
    Math.max(
        0,001,
        P -
        PV
    );
};


const getRelFeuchte = (
    T,
    X,
    P
) => {

    const svp =
        getSVP(T);

    Wenn (
        svp <= 0
    ) {
        Rückgabewert: 0;
    }

    Rückholklemme

        (
            X *
            P
        ) /
        (
            svp *
            (
                622 +
                X
            )
        ) *
        100,

        0,
        100
    );
};


const getEnthalpie = (
    T,
    X
) => {

    zurückkehren (

        1,006 *
        T

        +

        (
            X /
            1000
        ) *
        (
            2501 +
            1,86 *
            T
        )
    );
};


const getTaupunkt = (
    T,
    rh
) => {

    Wenn (
        rh <= 0
    ) {
        Rückgabewert -273,15;
    }

    const a = 17.62;
    const b = 243.12;

    const alpha =

        Math.log(
            Klemme(
                rh,
                0,0001,
                100
            ) /
            100
        )

        +

        (
            A *
            T
        ) /
        (
            b +
            T
        );

    zurückkehren (
        B *
        Alpha
    ) /
    (
        A -
        Alpha
    );
};


const getDichte = (
    T,
    rh,
    P
) => {

    const pPa =
        P *
        100;

    const TK =
        T +
        273,15;

    Konstante PV =

        Klemme(
            rh,
            0,
            100
        ) /
        100 *

        getSVP(T) *

        100;

    zurückkehren (

        (
            pPa -
            PV
        ) /
        (
            287.058 *
            TK
        )

        +

        PV /
        (
            461,52 *
            TK
        )
    );
};


/*
    Berechnet die Sättigungstemperatur
    für einen gegebenen Feuchtegehalt x.
*/
const getSaturationTempForX = (
    X,
    P
) => {

    let low = -50;
    let high = 60;

    für (
        sei i = 0;
        i < 80;
        i++
    ) {

        Konstante Mitte =
            (
                niedrig +
                hoch
            ) /
            2;

        const xSat =
            getAbsFeuchte(
                Mitte
                100,
                P
            );

        Wenn (
            xSat <
            X
        ) {

            niedrig = mittel;

        } anders {

            hoch = mittel;
        }
    }

    zurückkehren (
        niedrig +
        hoch
    ) /
    2;
};


/*
    Ermittelt die notwendige Temperatur,
    damit bei gegebenem x eine gewünschte
    Maximale relative Feuchte wird eingehalten.
*/
const getTempForRhAtX = (
    X,
    Ziel-Rh,
    P
) => {

    let low = -50;
    let high = 80;

    für (
        sei i = 0;
        i < 80;
        i++
    ) {

        Konstante Mitte =
            (
                niedrig +
                hoch
            ) /
            2;

        const rh =
            getRelFeuchte(
                Mitte
                X,
                P
            );

        /*
            Mit steigender Temperatur sinkt
            bei konstantem x die relative Feuchte.
        */
        Wenn (
            rh >
            Ziel-Rh
        ) {

            niedrig = mittel;

        } anders {

            hoch = mittel;
        }
    }

    zurückkehren (
        niedrig +
        hoch
    ) /
    2;
};


const createZustand = (
    T,
    rh,
    xVal,
    P
) => {

    const zustand = {
        T,
        P
    };


    Wenn (
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
                P
            );

    } anders {

        zustand.rh =
            Klemme(
                rh,
                0,
                100
            );

        zustand.x =
            getAbsFeuchte(
                T,
                zustand.rh,
                P
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
            P
        );


    Rückgabezustand;
};


Funktion readNumber(
    Ausweis,
    Fallback = 0
) {

    const element =
        document.getElementById(id);

    if (!element) {
        Rückfalloption;
    }

    Konstante Wert =
        parseFloat(
            element.value
        );

    return Number.isFinite(value)
        ? Wert
        : zurückgreifen;
}


/* =====================================================
   HAUPTBERECHNUNG
   ======================================================= */

Funktion calculate() {

    const kritischeOberflaecheElement =
        document.getElementById(
            "kritischeOberflaeche"
        );


    const inputs = {

        Betriebsmodus:
            document.querySelector(
                'input[name="betriebsmodus"]:checked'
            ).Wert,

        Heizkonzept:
            document.querySelector(
                'input[name="heizkonzept"]:checked'
            ).Wert,

        regelungsart:
            document.querySelector(
                'input[name="regelungsart"]:checked'
            ).Wert,


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


        Volumenstrom:
            Math.max(
                0,
                readNumber(
                    "Volumenstrom",
                    5000
                )
            ),


        Druck:
            Math.max(
                100,
                readNumber(
                    "Druck",
                    1013,25
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
                "tempHeizRücklauf",
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
            Klemme(
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


        kuehlAnsatz:
            Math.max(
                0,
                readNumber(
                    "kuehlApproach",
                    2
                )
            ),


        Heizansatz:
            Math.max(
                0,
                readNumber(
                    "Heizansatz",
                    3
                )
            ),


        kritischeOberflaeche:

            (
                kritischeOberflaecheElement &&
                kritisches OberflaecheElement
                    .Wert
                    .trim() !== ""
            )

                ? parseFloat(
                    kritisches OberflaecheElement
                        .Wert
                )

                : null
    };


    Konstante außerhalb =
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


    Wenn (
        inputs.regelungsart ===
        "X"
    ) {

        const rhDisplay =
            document.getElementById(
                "rh-Ergebnis"
            );

        if (rhDisplay) {

            rhDisplay.textContent =
                target.rh.toFixed(1);
        }
    }


    const result =
        simulateProcess(
            draußen,
            Ziel,
            Eingaben
        );


    updateInputValidation(
        Ergebnis,
        Eingaben
    );


    updateUI(
        Ergebnis,
        Eingaben
    );
}


function updateInputValidation(
    Ergebnis,
    Eingaben
) {
    const setError = (
        Ausweis,
        hasError
    ) => {
        const element =
            document.getElementById(id);

        if (element) {
            element.classList.toggle(
                "Eingabefehler",
                hasError
            );

            element.setAttribute(
                "aria-invalid",
                hasError ? "true" : "false"
            );
        }
    };

    setError(
        "tempHeizVorlauf",
        !result.waterConfig.heatingValid
    );

    setError(
        "tempHeizRücklauf",
        !result.waterConfig.heatingValid
    );

    const coolingError =
        inputs.betriebsmodus !== "heizen" &&
        !result.waterConfig.coolingValid;

    setError(
        "tempKuehlVorlauf",
        Kühlungsfehler
    );

    setError(
        "tempKuehlRuecklauf",
        Kühlungsfehler
    );
}


/* =====================================================
   KORRIGIERTE PROZESSSIMULATION

   Der erreichbare Zustand wird durch Taupunkt sowie
   Heiz- und Kühlwassertemperatur begrenzt. Unmögliche
   Übersättige Luftzuströme werden nicht erzeugt.
   ======================================================= */

Funktion simulateProcess(
    draußen,
    Ziel,
    Eingaben
) {
    const EPS_T = 0.05;
    const EPS_X = 0.02;

    const requiredProcess = [];
    const limitations = [];
    const plausibility = [];

    Konstante HeizungWasserGültig =
        inputs.tHeizV > inputs.tHeizR;

    const coolingWaterValid =
        inputs.tKuehlR > inputs.tKuehlV;

    Konstante maximaleHeizlufttemperatur =
        inputs.tHeizV - inputs.heizApproach;

    const minCoolingAirTemp =
        inputs.tKuehlV + inputs.kuehlApproach;

    const dryAirDensity =
        Math.max(
            0,
            (
                inputs.druck * 100 -
                outside.rh / 100 * getSVP(outside.T) * 100
            ) /
            (
                287.058 *
                (outside.T + 273,15)
            )
        );

    Konstante mAir =
        inputs.volumenstrom * dryAirDensity / 3600;

    let s1 = { ...outside };
    let s2 = { ...outside };
    let s3 = { ...outside };

    sei pVE = 0;
    sei pK = 0;
    sei pNE = 0;
    Kondensat = 0;

    if (!heatingWaterValid) {
        limitations.push(
            „Unplausible Heizwassertemperaturen: Der Vorlauf muss wärmer als der Rücklauf sein. Vor- und Nacherhitzer werden nicht berücksichtigt.“
        );
    }

    Wenn (
        inputs.betriebsmodus !== "heizen" &&
        !coolingWaterValid
    ) {
        limitations.push(
            „Unplausible Kühlwassertemperaturen: Der Rücklauf muss wärmer als der Vorlauf sein. Der Kühler wird nicht berücksichtigt.“
        );
    }

    const addHeatingLimit = desiredTemp => {
        if (desiredTemp > maxHeatingAirTemp + EPS_T) {
            limitations.push(
                `Die Solltemperatur von ${desiredTemp.toFixed(1)} °C ist mit ${inputs.tHeizV.toFixed(1)} °C Heizwasser-Vorlauf und ${inputs.heizApproach.toFixed(1)} K Temperaturabstand nicht erreichbar. Überschlägig sind höchstens etwa ${maxHeatingAirTemp.toFixed(1)} °C Lufttemperatur möglich.`
            );
        }
    };

    const heatState = (
        Einlass,
        gewünschte Temperatur
    ) => {
        if (!heatingWaterValid) {
            return { ...inlet };
        }

        addHeatingLimit(desiredTemp);

        const achievableTemp =
            Math.min(
                gewünschte Temperatur
                maxHeizlufttemperatur
            );

        if (achievableTemp <= inlet.T + EPS_T) {
            return { ...inlet };
        }

        return createZustand(
            erreichbareTemp,
            null,
            inlet.x,
            inputs.druck
        );
    };

    const coolState = (
        Einlass,
        gewünschte Temperatur
        Kondensation zulassen
    ) => {
        if (!coolingWaterValid) {
            return { ...inlet };
        }

        const inletDewPoint =
            getSaturationTempForX(
                inlet.x,
                inputs.druck
            );

        let lowerLimit = minCoolingAirTemp;

        if (!allowCondensation) {
            Untergrenze = Math.max(
                Untergrenze,
                Einlasstaupunkt
            );

            if (desiredTemp < inletDewPoint - EPS_T) {
                limitations.push(
                    „Reine sinnvolle Kühlung ist nur bis zum Taupunkt von etwa ${inletDewPoint.toFixed(1)} °C möglich.“ Für ${desiredTemp.toFixed(1)} °C wäre Kühlung mit Kondensation und Entfeuchtung erforderlich.`
                );
            }
        }

        if (desiredTemp < minCoolingAirTemp - EPS_T) {
            limitations.push(
                `Die gewünschte Kühleraustrittstemperatur von ${desiredTemp.toFixed(1)} °C ist mit ${inputs.tKuehlV.toFixed(1)} °C Kühlwasser-Vorlauf und ${inputs.kuehlApproach.toFixed(1)} K Temperaturabstand nicht erreichbar. Überschlägig sind mindestens etwa ${minCoolingAirTemp.toFixed(1)} °C Lufttemperatur erreichbar.`
            );
        }

        const achievableTemp =
            Math.max(
                gewünschte Temperatur
                Untergrenze
            );

        if (achievableTemp >= inlet.T - EPS_T) {
            limitations.push(
                „Mit dem eingegebenen Kühlwasserniveau ist keine wirksame Abkühlung des aktuellen Luftzustands möglich.“
            );
            return { ...inlet };
        }

        const xSaturation =
            getAbsFeuchte(
                erreichbareTemp,
                100,
                inputs.druck
            );

        const outletX =
            Kondensation zulassen
                ? Math.min(inlet.x, xSaturation)
                : inlet.x;

        return createZustand(
            erreichbareTemp,
            null,
            OutletX,
            inputs.druck
        );
    };

    /* Vorerhitzer für Frostschutz im Standardkonzept. */
    Wenn (
        inputs.heizkonzept === "standard" &&
        outside.T < inputs.tVEZiel - EPS_T
    ) {
        konstant erhitzt =
            Wärmezustand(
                draußen,
                inputs.tVEZiel
            );

        if (heated.T > outside.T + EPS_T) {
            s1 = erhitzt;
            pVE = mAir * (s1.h - outside.h);
            erforderlichProcess.push("Vorerwärmen/Frostschutz");
        }
    }

    s2 = { ...s1 };

    if (inputs.betriebsmodus === "kuehlen_sensibel") {
        if (s1.T > target.T + EPS_T) {
            s2 = coolState(
                s1,
                target.T,
                FALSCH
            );

            if (s2.T < s1.T - EPS_T) {
                pK = mAir * (s2.h - s1.h);
                erforderlichProcess.push("Sensibel cool");
            }
        }
    } else if (inputs.betriebsmodus === "entfeuchten") {
        Konstante Entfeuchtungsbedarf =
            s1.x > target.x + EPS_X;

        if (needDehum) {
            const requiredDewPoint =
                getSaturationTempForX(
                    target.x,
                    inputs.druck
                );

            s2 = coolState(
                s1,
                erforderlicher Taupunkt
                WAHR
            );

            if (s2.T < s1.T - EPS_T) {
                pK = mAir * (s2.h - s1.h);
                requiredProcess.push("Kühlen");

                if (s2.x < s1.x - EPS_X) {
                    requiredProcess.push("Entfeuchten");
                }
            }
        } else if (s1.T > target.T + EPS_T) {
            /* Im Entfeuchtungsmodus darf beim Unterschreiten
               des Taupunkts reales Kondensat entstehen. */
            s2 = coolState(
                s1,
                target.T,
                WAHR
            );

            if (s2.T < s1.T - EPS_T) {
                pK = mAir * (s2.h - s1.h);
                requiredProcess.push("Kühlen");

                if (s2.x < s1.x - EPS_X) {
                    requiredProcess.push("Entfeuchten");
                } anders {
                    erforderlichProcess.push("Sensibel cool");
                }
            }
        }

        Kondensat =
            mAir *
            Math.max(0, s1.x - s2.x) *
            3.6;
    } else if (outside.T > target.T + EPS_T) {
        limitations.push(
            „Kühlung wäre erforderlich, ist im Betriebsmodus „Nur Heizen“ jedoch nicht verfügbar.“
        );
    }

    /* Heizen oder Nacherwärmen auf den erreichbaren Wert. */
    if (s2.T < target.T - EPS_T) {
        const previousCooling = pK < -0,01;

        Wenn (
            inputs.heizkonzept === "ve_hauptleistung" &&
            vorherige Kühlung
        ) {
            limitations.push(
                „Nacherwärmung wäre erforderlich, ist in der gewählten Anlagenkonfiguration jedoch nicht verfügbar.“
            );
            s3 = { ...s2 };
        } else if (
            inputs.heizkonzept === "ve_hauptleistung" &&
            !previousCooling
        ) {
            const heating = heatState(s2, target.T);

            if (heated.T > s2.T + EPS_T) {
                s1 = erhitzt;
                s2 = { ...erhitzt };
                s3 = { ...erhitzt };
                pVE = mAir * (heated.h - outside.h);
                erforderlichProcess.push("Heizen");
            } anders {
                s3 = { ...s2 };
            }
        } anders {
            s3 = heatState(s2, target.T);

            if (s3.T > s2.T + EPS_T) {
                pNE = mAir * (s3.h - s2.h);
                requiredProcess.push(
                    vorherige Kühlung
                        ? "Nacherwärmen"
                        : "Heizen"
                );
            }
        }
    } anders {
        s3 = { ...s2 };
    }

    const finalState = { ...s3 };

    if (finalState.x < target.x - EPS_X) {
        limitations.push(
            `Der Soll-Feuchtegehalt von ${target.x.toFixed(2)} g/kg wird nicht erreicht. Die tatsächliche Zuluft enthält ${finalState.x.toFixed(2)} g/kg. Zur vollständigen Zielerreichung wäre eine Befeuchtung erforderlich.`
        );
    } else if (finalState.x > target.x + EPS_X) {
        limitations.push(
            `Der Soll-Feuchtegehalt von ${target.x.toFixed(2)} g/kg wird überschritten. Die tatsächliche Zuluft enthält ${finalState.x.toFixed(2)} g/kg. Zur Zielerreichung wäre eine zusätzliche Entfeuchtung erforderlich.`
        );
    }

    const targetReached =
        Math.abs(finalState.T - target.T) <= 0.15 &&
        Math.abs(finalState.x - target.x) <= 0.05;

    if (requiredProcess.length === 0) {
        requiredProcess.push(
            Ziel erreicht
                ? „Keine Luftbehandlung erforderlich“
                : „Sollzustand mit der gewählten Betriebsart nicht erreichbar“
        );
    }

    const cpW = 4.187;
    const rhoW = 1000;

    const waterFlow = (
        Leistung,
        deltaT
    ) =>
        Leistung > 0 und DeltaT > 0
            ? Leistung * 3600 /
                (cpW * deltaT * rhoW)
            : 0;

    const wvVE = waterFlow(
        pVE,
        inputs.tHeizV - inputs.tHeizR
    );

    const wvNE = waterFlow(
        pNE,
        inputs.tHeizV - inputs.tHeizR
    );

    const wvK = waterFlow(
        Math.abs(pK),
        inputs.tKuehlR - inputs.tKuehlV
    );

    zurückkehren {
        Zustände: [außen, s1, s2, s3],
        Endzustand,
        Ziel,
        Ziel erreicht,
        requiredProcess: [...new Set(requiredProcess)],
        Einschränkungen: [...neue Menge(Einschränkungen)],
        Plausibilität,
        waterConfig: {
            HeizungGültig: HeizungWasserGültig,
            coolingValid: coolingWaterValid
        },
        Kräfte: {
            pVE,
            pK,
            pNE,
            Kondensat,
            wvVE,
            wvK,
            wvNE
        }
    };
}


/* =====================================================
   PROZESSSIMULATION
   ======================================================= */

Funktion simulateProcessLegacy(
    draußen,
    Ziel,
    Eingaben
) {

    const EPS_T = 0.05;
    const EPS_X = 0.02;


    /*
        Luftmassenstrom auf Basis
        der berechneten Außenluftdichte.
    */
    Konstante mAir =

        inputs.volumenstrom *

        außerhalb.rho /

        3600;


    const needCooling =

        außerhalb.T >

        Ziel.T +

        EPS_T;


    Konstante Heizbedarf =

        außerhalb.T <

        target.T -

        EPS_T;


    Konstante Entfeuchtungsbedarf =

        outside.x >

        target.x +

        EPS_X;


    const needHum =

        außerhalb.x <

        target.x -

        EPS_X;


    sei s1 = {
        ...draußen
    };

    sei s2 = {
        ...draußen
    };

    sei s3 = {
        ...draußen
    };


    sei pVE = 0;
    sei pK = 0;
    sei pNE = 0;

    Kondensat = 0;

    let coolingTargetTemp = null;


    const requiredProcess = [];
    const limitations = [];
    const plausibility = [];


    /*
        Betriebsmodi:

        Heizen
        = keine Kühlung verfügbar

        kuehlen_sensibel
        = nur sinnvolle Kühlung,
          keine aktive Entfeuchtung

        entfeuchten
        = Kühlung und Entfeuchtung möglich
    */
    Konstante KühlungVerfügbar =
        inputs.betriebsmodus !==
        "heizen";


    const dehumAvailable =
        inputs.betriebsmodus ===
        "entfeuchten";


    /* =================================================
       1. VORERHITZER / FROSTSCHUTZ
       ================================================== */

    Wenn (

        inputs.heizkonzept ===
        "Standard"

        &&

        außerhalb.T <
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
       ================================================== */


    /*
        MODUS:
        KÜHLEN SENSIBEL

        Wichtig:
        Die Solltemperatur wird angefahren.

        x bleibt konstant.

        Die relative Feuchte wird
        aus dem realen Zustand berechnet.

        Eine eventuell erforderliche Entfeuchtung
        wird nur als Hinweis angezeigt.
    */
    Wenn (
        inputs.betriebsmodus ===
        "kuehlen_sensibel"
    ) {

        Wenn (
            s1.T >
            Ziel.T +
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


            Wenn (
                Entfeuchtung erforderlich
            ) {

                limitations.push(
                    „Der gewünschte Feuchtezustand erfordert zusätzliche Entfeuchtung. Im Modus „Kühlen (sensibel)“ bleibt der Feuchtegehalt x unverändert.“
                );
            }


            Wenn (
                needHum
            ) {

                limitations.push(
                    „Der gewünschte Feuchtezustand würde zusätzlich eine Befeuchtung erfordern. Im Modus „Kühlen (sensibel)“ bleibt der Feuchtegehalt x unverändert.“
                );
            }

        } anders {

            s2 = {
                ...s1
            };
        }
    }


    /*
        MODUS:
        KÜHLEN & ENTFEUCHTEN
    */
    sonst wenn (
        inputs.betriebsmodus ===
        "entfeuchten"
    ) {

        /*
            Entfeuchtung erforderlich:
            auf den zur Sollfeuchte passenden
            Sättigungszustand kühlen.
        */
        Wenn (
            Entfeuchtung erforderlich
        ) {

            requiredProcess.push(
                "Kühlen",
                "Entfeuchten"
            );


            Kühlungszieltemperatur =
                getSaturationTempForX(
                    target.x,
                    inputs.druck
                );


            s2 =
                createZustand(
                    Kühlungszieltemperatur
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


            Kondensat =

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
        sonst wenn (
            s1.T >
            Ziel.T +
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


            Wenn (
                needHum
            ) {

                limitations.push(
                    „Die Solltemperatur wird erreicht, der höhere gewünschte Feuchtegehalt würde jedoch eine Befeuchtung erfordern.“
                );
            }
        }


        anders {

            s2 = {
                ...s1
            };


            Wenn (
                needHum
            ) {

                limitations.push(
                    „Zur vollständigen Zielreichung wäre eine Befeuchtung erforderlich. Diese Funktion ist im aktuellen Anlagenmodell nicht enthalten.“
                );
            }
        }
    }


    /*
        MODUS:
        NUR HEIZEN
    */
    anders {

        s2 = {
            ...s1
        };


        Wenn (
            Kühlung erforderlich
        ) {

            limitations.push(
                „Kühlung wäre erforderlich, ist im Betriebsmodus „Nur Heizen“ jedoch nicht verfügbar.“
            );
        }


        Wenn (
            Entfeuchtung erforderlich
        ) {

            limitations.push(
                „Entfeuchtung wäre erforderlich, ist im Betriebsmodus „Nur Heizen“ jedoch nicht verfügbar.“
            );
        }
    }


    /* =================================================
       3. HEIZEN / NACHERWÄRMEN
       ================================================== */


    /*
        Fällt in den Kühler-/Ausgangszustand
        Die Temperatur unter Soll liegt.
    */
    Wenn (
        s2.T <
        target.T -
        EPS_T
    ) {

        /*
            Nach vorgekühlt /
            Entfeuchtung = Nacherwärmung
        */
        const previousCooling =
            pK <
            -0,01;


        Wenn (
            vorherige Kühlung
        ) {

            requiredProcess.push(
                "Nacherwärmen"
            );

        } anders {

            requiredProcess.push(
                "Heizen"
            );
        }


        Wenn (
            inputs.heizkonzept ===
            "Standard"
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

        } anders {

            /*
                VE als Haupterhitzer:
                Bei reinem Heizfall kann
                direkt über VE geheizt werden.
            */
            Wenn (
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

            } anders {

                limitations.push(
                    „Nacherwärmung wäre erforderlich, ist in der gewählten Anlagenkonfiguration jedoch nicht verfügbar.“
                );


                s3 = {
                    ...s2
                };
            }
        }

    } anders {

        s3 = {
            ...s2
        };
    }


    /* =================================================
       4. SONDERFALL REINER HEIZBETRIEB
       ================================================== */

    Wenn (

        inputs.betriebsmodus ===
        "heizen"

        &&

        Heizung erforderlich

    ) {

        Wenn (
            inputs.heizkonzept ===
            "Standard"
        ) {

            /*
                Eventueller Frostschutz über VE
            */
            Wenn (
                außerhalb.T <
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

            } anders {

                s1 = {
                    ...draußen
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


            Wenn (
                !requiredProcess.includes(
                    "Heizen"
                )
            ) {

                requiredProcess.push(
                    "Heizen"
                );
            }

        } anders {

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


            Wenn (
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
       ================================================== */

    Wenn (
        requiredProcess.length ===
        0
    ) {

        requiredProcess.push(
            „Keine Luftbehandlung erforderlich“
        );
    }


    const finalState = {
        ...s3
    };


    /*
        Soll erreicht:
        Temperatur und Feuchtegehalt
        müssen.

        Relative Feuchte ergibt sich
        automatisch daraus.
    */
    const targetReached =

        Math.abs(
            finalState.T -
            target.T
        ) <=
        0,15

        &&

        Math.abs(
            finalState.x -
            target.x
        ) <=
        0,05;


    /* =================================================
       6. WASSERVOLUMENSTRÖME
       ================================================== */

    const cpW = 4.187;
    const rhoW = 1000;


    Konstante wvVE =

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


    Konstante wvNE =

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
       7. Plausibilität Kühlwasser
       ================================================== */

    Wenn (

        inputs.betriebsmodus ===
        "entfeuchten"

        &&

        Entfeuchtung erforderlich

        &&

        coolingTargetTemp !==
        null

    ) {

        const margin =

            Kühlungszieltemperatur -

            inputs.tKuehlV;


        Wenn (
            Rand <= 0
        ) {

            plausibility.push(

                `⚠ Kühlwasser ${inputs.tKuehlV.toFixed(1)}/${inputs.tKuehlR.toFixed(1)} °C ist für den erforderlichen Lufttaupunkt von ca. ${coolingTargetTemp.toFixed(1)} °C voraussichtlich zu warm.`

            );

        } else if (
            Rand <
            2
        ) {

            plausibility.push(

                `⚠ Nur ${margin.toFixed(1)} K Temperaturreserve zwischen Kühlwasser-Vorlauf und erforderlichem Lufttaupunkt. Die tatsächliche Erreichbarkeit hängt stark von der Registerauslegung ab.`

            );

        } anders {

            plausibility.push(

                „ ✓ Kühlwasserniveau grundsätzlich plausibel. Die tatsächliche Erreichbarkeit hängt von Registerauslegung, Wärmeübergang und Bypass-Faktor ab.“

            );
        }
    }


    zurückkehren {

        Staaten: [
            draußen,
            s1,
            s2,
            s3
        ],

        Endzustand,

        Ziel,

        Ziel erreicht,

        Erforderlicher Prozess:
            [
                ...neues Set(
                    erforderlicher Prozess
                )
            ],

        Einschränkungen,

        Plausibilität,

        Kräfte: {

            pVE,
            pK,
            pNE,

            Kondensat,

            wvVE,
            wvK,
            wvNE
        }
    };
}


/* =====================================================
   AUSGABE
   ======================================================= */

function updateUI(
    Ergebnis,
    Eingaben
) {

    const f = (
        Wert,
        Ziffern = 1
    ) => {

        return Number.isFinite(
            Wert
        )

            ? Wert
                .toFixed(
                    Ziffern
                )
                .ersetzen(
                    ".",
                    ","
                )

            : "--";
    };


    result.states.forEach(
        (
            Zustand,
            Index
        ) => {

            setText(
                `res-t-${index}`,
                F(
                    state.T,
                    1
                )
            );


            setText(
                `res-rh-${index}`,
                F(
                    state.rh,
                    1
                )
            );


            setText(
                `res-x-${index}`,
                F(
                    state.x,
                    2
                )
            );
        }
    );


    setText(
        "res-td-0",
        F(
            result.states[0].td,
            1
        )
    );


    setText(
        "res-t-final",
        F(
            result.finalState.T,
            1
        )
    );


    setText(
        "res-rh-final",
        F(
            result.finalState.rh,
            1
        )
    );


    setText(
        "res-x-final",
        F(
            result.finalState.x,
            2
        )
    );


    setText(
        "res-td-final",
        F(
            result.finalState.td,
            1
        )
    );


    setText(

        "Ziellinie",

        `Soll: ${f(result.target.T, 1)} °C | ` +

        `${f(result.target.rh, 1)} % rF | ` +

        `x ${f(result.target.x, 2)} g/kg | ` +

        `Td ${f(result.target.td, 1)} °C`

    );


    setText(
        "res-p-ve",
        F(
            result.powers.pVE,
            2
        )
    );


    setText(
        "res-pk",
        F(
            Math.abs(
                result.powers.pK
            ),
            2
        )
    );


    setText(
        "res-p-ne",
        F(
            result.powers.pNE,
            2
        )
    );


    setText(
        "res-kondensat",
        F(
            result.powers.condensate,
            2
        )
    );


    setText(
        "res-wv-ve",
        F(
            result.powers.wvVE,
            2
        )
    );


    setText(
        "res-wv-k",
        F(
            result.powers.wvK,
            2
        )
    );


    setText(
        "res-wv-ne",
        F(
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
            Gesamtwärme
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

        "Zusammenfassungskondensat",

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
        Ergebnis
    );


    updateHints(
        Ergebnis,
        Eingaben
    );


    updateSummary(
        Ergebnis
    );
}


/* =====================================================
   PROZESSGRAFIK
   ======================================================= */

function updateVisuals(
    Ergebnis
) {

    Konst. Übersicht =
        document.createElement(
            "div"
        );


    Übersicht.Klassenname =

        `process-overview ${

            result.targetReached

                "Prozess erfolgreich"

                : "Prozesswarnung"

        }`;


    Übersicht.innerHTML =

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

                    Ergebnisbeschränkungen

                        .Karte(
                            Text =>
                                `⚠ ${escapeHtml(text)}`
                        )

                        .verbinden(
                            "<br>"
                        )

                }</div>`

                :

                ""

        );


    const container =
        document.getElementById(
            "Prozessübersichtscontainer"
        );


    container.innerHTML = "";


    container.appendChild(
        Überblick
    );


    setComponentState(

        "comp-ve",

        result.powers.pVE >
        0,01,

        "Heizung"

    );


    setComponentState(

        "comp-k",

        result.powers.pK <
        -0,01,

        "Kühlung"

    );


    setComponentState(

        "comp-ne",

        result.powers.pNE >
        0,01,

        "Heizung"

    );


    setText(

        "status-ve",

        result.powers.pVE >
        0,01

            ? "aktiv"

            : "keine Behandlung"

    );


    setText(

        "status-k",

        result.powers.pK <
        -0,01

            ?

            (

                result.powers.condensate >
                0,01

                    ? "Kühlen + Entfeuchten"

                    "sensibel kühlen"

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
        0,01

        &&

        !result.targetReached;


    setText(

        "status-ne",

        Nicht verfügbar

            ?

            „⚠ erforderlich, nicht verfügbar“

            :

            (

                result.powers.pNE >
                0,01

                    ? "aktiv"

                    : "keine Behandlung"

            )

    );


    dokumentieren
        .getElementById(
            "comp-ne"
        )
        .classList.toggle(
            "nicht verfügbar",
            Nicht verfügbar
        );


    setNodeColor(
        "Knoten-0",
        "Quelle"
    );


    setNodeColor(

        "Knoten-1",

        tempColor(

            result.states[1].T,

            result.states[0].T

        )
    );


    setNodeColor(

        "Knoten-2",

        tempColor(

            result.states[2].T,

            result.states[1].T

        )
    );


    setNodeColor(

        "Knoten-3",

        tempColor(

            result.states[3].T,

            result.states[2].T

        )
    );


    /*
        Der Zuluft-Endzustand erhält
        die Farbe entsprechend dem
        letzter Realen Prozess.
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
   ======================================================= */

Funktion updateHints(
    Ergebnis,
    Eingaben
) {

    const hints = [];


    const f =
        Wert =>

            Wert

                .toFixed(1)

                .ersetzen(
                    ".",
                    ","
                );


    Wenn (
        result.targetReached
    ) {

        hints.push(

            „<strong> ✓ Zuluft-Sollzustand erreicht.</strong>“

        );

    } anders {

        hints.push(

            `<strong>⚠ Sollzustand nicht vollständig erreichbar.</strong> ` +

            `Tatsächliche Zuluft: ${formatState(result.finalState)}.`

        );
    }


    /*
        Zusätzliche, besonders verständliche
        Feuchtebewertung bei vernünftiger Kühlung.
    */
    Wenn (

        inputs.betriebsmodus ===
        "kuehlen_sensibel"

        &&

        Math.abs(
            result.finalState.T -
            result.target.T
        ) <=
        0,15

        &&

        Math.abs(
            result.finalState.rh -
            result.target.rh
        ) >
        0,5

    ) {

        Wenn (
            result.finalState.rh >
            result.target.rh
        ) {

            hints.push(

                `⚠ Die Solltemperatur wird erreicht, die relative Feuchte beträgt jedoch ${f(result.finalState.rh)} % statt ${f(result.target.rh)} %. ` +

                „Für den gewünschten niedrigeren Feuchtewert wäre zusätzlich eine Entfeuchtung erforderlich.“

            );

        } anders {

            hints.push(

                `Hinweis: Die Solltemperatur wird erreicht, die relative Feuchte beträgt ${f(result.finalState.rh)} % statt ${f(result.target.rh)} %. ` +

                „Für den gewünschten höheren Feuchtewert wäre zusätzlich eine Befeuchtung erforderlich.“

            );
        }
    }


    /*
        Mindesttemperatur bei vorgegebener Temperatur
        maximaler relativer Feuchte.
    */
    Wenn (

        result.finalState.rh >

        inputs.maxZuluftRh +

        0,5

    ) {

        const minT =

            getTempForRhAtX(

                result.finalState.x,

                inputs.maxZuluftRh,

                inputs.druck

            );


        Wenn (

            minT >

            result.finalState.T +

            0,1

        ) {

            hints.push(

                `Für höchstens ${inputs.maxZuluftRh.toFixed(0)} % rF müsste die Luft bei gleichem Feuchtegehalt auf mindestens ca. <strong>${f(minT)} °C</strong> erwärmt werden. ` +

                „Der Feuchtegehalt x und der Taupunkt bleiben dabei unverändert.“

            );
        }
    }


    /*
        Optionale Taupunktreserve
        zur kritischen Oberfläche.
    */
    Wenn (
        Number.isFinite(
            inputs.kritischeOberflaeche
        )
    ) {

        Konstante Reserve =

            inputs.kritischeOberflaeche -

            result.finalState.td;


        Wenn (
            Reserve <
            0
        ) {

            hints.push(

                `<strong>⚠ Kondensationsrisiko:</strong> ` +

                `Zulufttaupunkt ${f(result.finalState.td)} °C liegt über der kritischen Oberflächentemperatur ${f(inputs.kritischeOberflaeche)} °C.`

            );

        } else if (

            Reserve <

            inputs.taupunktReserve

        ) {

            hints.push(

                `<strong>⚠ Geringe Taupunktreserve:</strong> ${f(reserve)} K.`

            );

        } anders {

            hints.push(

                ` ✓ Taupunktreserve zur eingegebenen kritischen Oberfläche: ${f(reserve)} K.`

            );
        }
    }


    dokumentieren
        .getElementById(
            "Bedienungshinweise"
        )
        .innerHTML =

        Hinweise

            .Karte(
                Hinweis =>
                    `<div class="hint-row">${hint}</div>`
            )

            .verbinden("");
}


/* =====================================================
   ZUSAMMENFASSUNG
   ======================================================= */

Funktion updateSummary(
    Ergebnis
) {

    setText(

        "Zusammenfassungsprozess",

        `Prozess: ${result.requiredProcess.join(" → ")}`

    );


    const status =

        document.getElementById(
            "summary-target-status"
        );


    status.textContent =

        result.targetReached

            ? "✓ Zielzustand erreicht"

            : „⚠ Zielzustand nicht vollständig erreicht“;


    status.className =

        result.targetReached

            ? "Bewertung OK"

            : "Bewertungswarnung";


    const notes = [

        ...Ergebnis.Plausibilität,

        ...result.limitations.map(
            Text =>
                `⚠ ${text}`
        )
    ];


    dokumentieren
        .getElementById(
            "Zusammenfassung-Plausibilität"
        )
        .innerHTML =

        Notizen.Länge

            ?

            Notizen

                .Karte(
                    escapeHtml
                )

                .verbinden(
                    "<br>"
                )

            :

            „ ✓ Keine besonderen Plausibilitätswarnungen.“;
}


/* =====================================================
   HILFSFUNKTIONEN
   ======================================================= */

function setComponentState(
    Ausweis,
    aktiv,
    Typ
) {

    const node =
        document.getElementById(
            Ausweis
        );

    if (!node) {
        zurückkehren;
    }


    node.classList.remove(
        "aktive Heizung",
        "aktive Kühlung"
        "inaktiv"
    );


    node.classList.add(

        aktiv

            ?

            (
                Typ ===
                "Heizung"

                    ? "aktive Heizung"

                    : "aktive Kühlung"
            )

            :

            "inaktiv"
    );
}


function setNodeColor(
    Ausweis,
    Typ
) {

    const node =
        document.getElementById(
            Ausweis
        );

    if (!node) {
        zurückkehren;
    }


    node.classList.remove(
        "Farbe-Rot",
        "Farbe-Blau",
        "Farbquelle"
    );


    Wenn (
        Typ
    ) {

        node.classList.add(
            `color-${type}`
        );
    }
}


Funktion tempColor(
    Temperatur,
    Basistemperatur
) {

    Wenn (

        Temperatur >

        Basistemperatur +

        0,1

    ) {

        return "rot";
    }


    Wenn (

        Temperatur <

        Basistemperatur -

        0,1

    ) {

        Rückgabe "blau";
    }


    return null;
}


function setText(
    Ausweis,
    Wert
) {

    const element =
        document.getElementById(
            Ausweis
        );


    Wenn (
        Element
    ) {

        element.textContent =
            Wert;
    }
}


Funktion signed(
    Wert,
    Ziffern
) {

    zurückkehren (

        Wert >
        0

            ? "+"

            : ""

    )

    +

    Wert

        .toFixed(
            Ziffern
        )

        .ersetzen(
            ".",
            ","
        );
}


Funktion formatState(
    Zustand
) {

    zurückkehren (

        `${state.T.toFixed(1).replace(".", ",")} °C / ` +

        `${state.rh.toFixed(1).replace(".", ",")} % rF / ` +

        `x ${state.x.toFixed(2).replace(".", ",")} g/kg / ` +

        `Td ${state.td.toFixed(1).replace(".", ",")} °C`

    );
}


function escapeHml(
    Wert
) {

    return String(
        Wert
    )

        .replaceAll(
            "&",
            "&Ampere;"
        )

        .replaceAll(
            "<",
            "<"
        )

        .replaceAll(
            ">",
            ">"
        )

        .replaceAll(
            '"',
            """
        )

        .replaceAll(
            "'",
            "'"
        );
}
