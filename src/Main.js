import React from "react";
import simple, {css} from "react-simple";
import {Route, Switch, Link} from "react-router-dom";
import qs from "querystring";

import {View} from "./core";

import Dz from "./Dz";

css.global("body, html", {
    padding: 0,
    margin: 0,
    backgroundColor: "black",
});

const Container = simple(View, {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
});

const Wrap = simple(View, {
    backgroundColor: "white",
    flex: 1,
    width: "100%",
    // overflowX: "auto",
    "@media (min-width: 450px)": {
        width: 450,
    },
});

const Title = simple(View.create(Link), {
    fontSize: 40,
    textDecoration: "none",
    color: "black",
});

const DZLink = ({icaocode, fmisid, lat, lon}) => (
    <Link
        to={{
            pathname: "/dz",
            search: qs.stringify({icaocode, fmisid, latlon: `${lat},${lon}`}),
        }}
    >
        EFJY
    </Link>
);

const FrontPage = () => (
    <View>
        Etusivu
        <DZLink icaocode="EFJY" fmisid="101339" lat="62.407390" lon="62.407390">
            EFJY
        </DZLink>
    </View>
);

const Main = () => (
    <Container>
        <Wrap>
            <Title to="/">Hyppykeli.fi</Title>
            <Switch>
                <Route exact path="/" component={FrontPage} />
                <Route path="/dz" component={Dz} />
            </Switch>
        </Wrap>
    </Container>
);

export default Main;
