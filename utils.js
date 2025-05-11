// Utils.js - Utility functions for hotel booking data visualizations

/**
 * Format numbers with commas for thousands separator
 * @param {number} num - Number to format
 * @param {number} precision - Decimal precision
 * @return {string} Formatted number
 */
function formatThousands(num, precision = 0) {
    if (num === 0) return '0';
    if (isNaN(num)) return '-';

    // Handle decimal precision
    if (precision === 0 && Number.isInteger(num)) {
        return new Intl.NumberFormat('id-ID').format(num);
    } else {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        }).format(num);
    }
}

/**
 * Format numbers as percentages
 * @param {number} num - Number to format (0-100)
 * @param {number} precision - Decimal precision
 * @return {string} Formatted percentage
 */
function formatPercentage(num, precision = 1) {
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
        style: 'percent',
        multiplier: 0.01
    }).format(num);
}

/**
 * Add a watermark to an SVG
 * @param {d3.Selection} svg - The SVG element to add watermark to
 * @param {number} width - Width of the SVG
 * @param {number} height - Height of the SVG
 * @param {string} text - Watermark text
 * @param {number} alpha - Opacity of the watermark
 */
function addWatermark(svg, width, height, text = "Analisis Data Hotel Booking", alpha = 0.05) {
    svg.append("text")
        .attr("class", "watermark")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 40)
        .attr("fill", "gray")
        .attr("opacity", alpha)
        .attr("transform", `rotate(30 ${width / 2} ${height / 2})`)
        .text(text);
}

/**
 * Add title and caption to an SVG
 * @param {d3.Selection} svg - The SVG element
 * @param {string} title - Chart title
 * @param {string} subtitle - Chart subtitle
 * @param {string} caption - Chart caption
 * @param {number} width - Width of the SVG
 */
function addTitleAndCaption(svg, title, subtitle = null, caption = null, width) {
    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .text(title);

    // Add subtitle if provided
    if (subtitle) {
        svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", width / 2)
            .attr("y", 50)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("font-style", "italic")
            .text(subtitle);
    }

    // Add caption if provided
    if (caption) {
        const captionText = svg.append("text")
            .attr("class", "chart-caption")
            .attr("x", width / 2)
            .attr("y", svg.attr("height") - 15)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-style", "italic")
            .text(caption);
    }
}

/**
 * Add value labels to bars
 * @param {d3.Selection} selection - The bar selection
 * @param {boolean} percentage - Whether to format as percentage
 * @param {number} precision - Decimal precision
 * @param {string} color - Text color
 * @param {number} fontSize - Font size
 */
function addValueLabels(selection, percentage = false, precision = 1, color = "black", fontSize = 9) {
    selection.each(function (d) {
        const bar = d3.select(this);
        const x = parseFloat(bar.attr("x")) + parseFloat(bar.attr("width")) / 2;
        const y = parseFloat(bar.attr("y"));
        const height = parseFloat(bar.attr("height"));
        const value = d.value || d.data?.value || d[1] || d;

        let label;
        if (percentage) {
            label = formatPercentage(value, precision);
        } else if (precision === 0 || Number.isInteger(value)) {
            label = formatThousands(value, 0);
        } else {
            label = formatThousands(value, precision);
        }

        const parent = d3.select(this.parentNode);
        parent.append("text")
            .attr("class", "bar-label")
            .attr("x", x)
            .attr("y", y - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", fontSize)
            .attr("fill", color)
            .text(label);
    });
}

/**
 * Create horizontal bar chart
 * @param {d3.Selection} g - The group element to append to
 * @param {Array} data - The data array
 * @param {function} xScale - X scale function
 * @param {function} yScale - Y scale function
 * @param {string} fill - Bar fill color or function
 */
function createHorizontalBars(g, data, xScale, yScale, fill) {
    g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => yScale(d.name))
        .attr("x", 0)
        .attr("height", yScale.bandwidth())
        .attr("width", d => xScale(d.value))
        .attr("fill", fill);
}

/**
 * Create a color gradient based on values
 * @param {Array} colors - Array of colors for gradient
 * @param {number} minValue - Minimum value
 * @param {number} maxValue - Maximum value
 * @return {function} Color mapping function
 */
function createColorGradient(colors, minValue, maxValue) {
    const colorScale = d3.scaleLinear()
        .domain([minValue, (minValue + maxValue) / 2, maxValue])
        .range(colors);

    return function (value) {
        return colorScale(value);
    };
}

/**
 * Combine small categories into "Others"
 * @param {Array} data - Array of data objects
 * @param {string} valueKey - Key for the value
 * @param {string} nameKey - Key for the category name
 * @param {number} threshold - Threshold percentage (0-100)
 * @return {Array} New array with small categories combined
 */
function combineSmallCategories(data, valueKey, nameKey, threshold = 5) {
    // Calculate total for percentages
    const total = d3.sum(data, d => d[valueKey]);
    const minValue = total * threshold / 100;

    // Separate small and large categories
    const largeCategories = data.filter(d => d[valueKey] >= minValue);
    const smallCategories = data.filter(d => d[valueKey] < minValue);

    // Combine small categories if any exist
    if (smallCategories.length > 0) {
        const othersValue = d3.sum(smallCategories, d => d[valueKey]);
        if (othersValue > 0) {
            largeCategories.push({
                [nameKey]: "Others",
                [valueKey]: othersValue
            });
        }
    }

    return largeCategories;
}

/**
 * Add a caption with a background box
 * @param {d3.Selection} svg - The SVG element
 * @param {string} text - Caption text
 * @param {number} width - Width of the SVG
 * @param {number} height - Height of the SVG
 * @param {number} yPosition - Y position of the caption
 */
function addCaptionWithBox(svg, text, width, height, yPosition) {
    const captionText = svg.append("text")
        .attr("class", "chart-caption")
        .attr("x", width / 2)
        .attr("y", yPosition)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .text(text);

    // Get text dimensions and add background box
    const bbox = captionText.node().getBBox();
    svg.insert("rect", "text.chart-caption")
        .attr("class", "caption-box")
        .attr("x", bbox.x - 10)
        .attr("y", bbox.y - 5)
        .attr("width", bbox.width + 20)
        .attr("height", bbox.height + 10)
        .attr("fill", "white")
        .attr("stroke", "lightgray")
        .attr("rx", 5)
        .attr("opacity", 0.7);

    // Bring the text to front
    svg.node().appendChild(captionText.node());
}

/**
 * Create a legend
 * @param {d3.Selection} g - The group element to append to
 * @param {Array} items - Legend items with name and color
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} title - Legend title
 */
function createLegend(g, items, x, y, title = null) {
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${x}, ${y})`);

    // Add legend background
    const itemHeight = 20;
    const itemPadding = 5;
    const totalHeight = items.length * (itemHeight + itemPadding) + (title ? 30 : 0);
    const maxWidth = d3.max(items, d => d.name.length) * 7 + 40;

    legend.append("rect")
        .attr("class", "legend-bg")
        .attr("x", -10)
        .attr("y", -10 - (title ? 20 : 0))
        .attr("width", maxWidth)
        .attr("height", totalHeight)
        .attr("fill", "white")
        .attr("stroke", "#ccc")
        .attr("rx", 5)
        .attr("opacity", 0.8);

    // Add title if provided
    if (title) {
        legend.append("text")
            .attr("class", "legend-title")
            .attr("x", maxWidth / 2 - 10)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-weight", "bold")
            .text(title);
    }

    // Add items
    items.forEach((item, i) => {
        const yPos = i * (itemHeight + itemPadding);

        // Color box
        legend.append("rect")
            .attr("x", 0)
            .attr("y", yPos)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", item.color);

        // Label
        legend.append("text")
            .attr("x", 25)
            .attr("y", yPos + 12)
            .attr("font-size", 9)
            .text(item.name);
    });
}

/**
 * Create a standard CSS style for all charts
 * @return {string} CSS style text
 */
function createChartStyles() {
    return `
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f9f9f9;
    }
    .container {
        max-width: 1200px;
        margin: 0 auto;
        background-color: white;
        padding: 20px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        border-radius: 5px;
    }
    h1 {
        color: #333;
        text-align: center;
        margin-bottom: 30px;
    }
    a {
        display: inline-block;
        margin-bottom: 20px;
        color: #2C7BB6;
        text-decoration: none;
    }
    a:hover {
        text-decoration: underline;
    }
    #chart {
        display: flex;
        justify-content: center;
        margin: 20px 0;
    }
    .axis path,
    .axis line {
        stroke: #ccc;
    }
    .grid line {
        stroke: #eee;
    }
    .area-fill {
        opacity: 0.08;
    }
    .bar {
        stroke: white;
        stroke-width: 1;
    }
    .highlight-max {
        fill: green;
        opacity: 0.1;
    }
    .highlight-min {
        fill: red;
        opacity: 0.1;
    }
    .caption-box, .ratio-box {
        fill: white;
        stroke: lightgray;
        stroke-width: 1;
        rx: 5;
        opacity: 0.7;
    }
    .legend-box {
        fill: white;
        stroke: #ddd;
        stroke-width: 1;
        rx: 3;
        opacity: 0.8;
    }
    `;
}

// Define standard color scheme to match Python visualizations
const main_colors = ["#2C7BB6", "#D7191C", "#1A9641", "#FDAE61", "#FFFFBF", "#9E0142", "#A6761D", "#666666"];

// Create color scales to match Python visualizations
const blue_red_cmap = (t) => {
    return d3.interpolate("#2C7BB6", "#D7191C")(t);
};

const blue_green_cmap = (t) => {
    return d3.interpolate("#2C7BB6", "#1A9641")(t);
};

// Country code to name mapping to match Python
const country_names = {
    'PRT': 'Portugal',
    'GBR': 'Inggris (UK)',
    'FRA': 'Prancis',
    'ESP': 'Spanyol',
    'DEU': 'Jerman',
    'ITA': 'Italia',
    'IRL': 'Irlandia',
    'BEL': 'Belgia',
    'BRA': 'Brasil',
    'NLD': 'Belanda',
    'USA': 'Amerika Serikat',
    'CHE': 'Swiss',
    'AUT': 'Austria',
    'CN': 'China',
    'POL': 'Polandia',
    'RUS': 'Rusia'
};

// Month order to match Python
const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];