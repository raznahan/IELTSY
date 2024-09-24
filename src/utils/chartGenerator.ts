import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

export async function createChart(data: any[], type: 'line', title: string): Promise<Buffer> {
    const width = 800;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const configuration: any = {
        type: type,
        data: {
            labels: data.map(item => item.date.toLocaleDateString()),
            datasets: []
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 9,
                    ticks: {
                        stepSize: 0.5
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            }
        }
    };

    if (type === 'line' && data[0].hasOwnProperty('score')) {
        // Overall Band Score chart
        configuration.data.datasets.push({
            label: 'Overall Band Score',
            data: data.map(item => item.score),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        });
    } else if (type === 'line' && data[0].hasOwnProperty('TR')) {
        // Task-specific Scores chart
        const tasks = ['TR', 'CC', 'LR', 'GRA'];
        const colors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)'];
        
        tasks.forEach((task, index) => {
            configuration.data.datasets.push({
                label: task,
                data: data.map(item => item[task]),
                borderColor: colors[index],
                tension: 0.1
            });
        });
    }

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    return image;
}