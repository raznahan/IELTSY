import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const width = 400;
const height = 300;
const chartCallback = (ChartJS: any) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

export async function createChart(data: any, type: string, title: string) {
    let configuration;

    if (type === 'heatmap') {
        // Special handling for heatmap data
        configuration = {
            type: 'bar', // or another suitable chart type for heatmap representation
            data: {
                labels: Object.keys(data),
                datasets: Object.entries(data).map(([category, errors]: [string, any]) => ({
                    label: category,
                    data: [errors.length],
                    backgroundColor: getColorForCategory(category),
                })),
            },
            options: {
                // Add appropriate options for heatmap-like representation
            }
        };
    } else {
        // Existing configuration for other chart types
        configuration = {
            type: type,
            data: {
                labels: data.map((d: any) => d.date),
                datasets: [{
                    label: title,
                    data: data.map((d: any) => d.score),
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            }
        };
    }

    const image = await chartJSNodeCanvas.renderToBuffer(configuration as any);
    return image;
}

function getColorForCategory(category: string): string {
    // Return a color based on the category
    const colors = {
        TR: 'rgba(255, 99, 132, 0.5)',
        CC: 'rgba(54, 162, 235, 0.5)',
        LR: 'rgba(255, 206, 86, 0.5)',
        GRA: 'rgba(75, 192, 192, 0.5)',
    };
    return colors[category as keyof typeof colors] || 'rgba(0, 0, 0, 0.5)';
}