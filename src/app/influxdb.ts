import {InfluxDB, QueryApi} from "@influxdata/influxdb-client";
import {DeleteAPI} from "@influxdata/influxdb-client-apis";

class InfluxDBConnector {
    private static instance: InfluxDB | null = null;
    private static logger: any = console;

    private static getOrg() {
        const org = process.env.INFLUX_ORG;
        if (!org) {
            throw new Error('INFLUX_ORG is not defined in environment variables');
        }

        return org;
    }

    public static setLogger(logger: any) {
        this.logger = logger;
    }

    public static getQueryClient(): QueryApi {
        const client = this.getClient();
        const org = InfluxDBConnector.getOrg();
        return client.getQueryApi(org);
    }

    public static getClient(): InfluxDB {
        if (!InfluxDBConnector.instance) {
            const host = process.env.INFLUX_HOST
            const token = process.env.INFLUX_TOKEN
            if (!host) {
                throw new Error('INFLUX_HOST is not defined in environment variables');
            }
            if (!token) {
                throw new Error('INFLUX_TOKEN is not defined in environment variables');
            }

            InfluxDBConnector.instance = new InfluxDB({url: host, token});
            this.logger.info(`InfluxDBConnector.instance created`);
        }

        return InfluxDBConnector.instance;
    }

    public static close(): void {
        InfluxDBConnector.instance = null;
    }
}

export default InfluxDBConnector;

export async function deleteAgrosmartFromInfluxDB(id: string, influxClient: InfluxDB) {
    const deleteAPI = new DeleteAPI(influxClient);
    const org = process.env.INFLUX_ORG
    const bucket = process.env.INFLUX_BUCKET;
    if (org == null || bucket == null) {
        throw new Error("Missing org or bucket in env");
    }

    await deleteAPI.postDelete({
        org,
        bucket,
        body: {
            // Delete the whole data
            start: "1970-01-01T00:00:00Z",
            stop: "2100-01-01T00:00:00Z",
            predicate: `id="${id}"`,
        },
    });
}